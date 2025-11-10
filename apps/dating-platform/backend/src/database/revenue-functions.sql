-- =====================================================
-- 💰 REVENUE UPGRADE FUNCTIONS & TRIGGERS
-- Automated revenue optimization and tracking
-- =====================================================

-- Function: Automatically refund boosts that didn't meet view guarantee
CREATE OR REPLACE FUNCTION check_and_refund_boosts()
RETURNS void AS $$
DECLARE
    boost_record RECORD;
    refund_amount DECIMAL(10,2);
BEGIN
    FOR boost_record IN 
        SELECT id, user_id, guaranteed_views, actual_views, price_usd, payment_intent_id
        FROM guaranteed_boosts
        WHERE status = 'active'
        AND boost_end < NOW()
        AND actual_views < guaranteed_views
        AND refund_issued = false
    LOOP
        -- Calculate refund (full refund if under 50%, partial otherwise)
        IF boost_record.actual_views < (boost_record.guaranteed_views * 0.5) THEN
            refund_amount := boost_record.price_usd;
        ELSE
            refund_amount := boost_record.price_usd * 
                ((boost_record.guaranteed_views - boost_record.actual_views)::DECIMAL / boost_record.guaranteed_views);
        END IF;

        -- Update boost record
        UPDATE guaranteed_boosts
        SET status = 'refunded',
            refund_issued = true,
            refund_amount_usd = refund_amount,
            refunded_at = NOW(),
            guarantee_met = false
        WHERE id = boost_record.id;

        -- Log for manual payment processing
        INSERT INTO activity_feed (user_id, activity_type, description, metadata)
        VALUES (
            boost_record.user_id,
            'boost_refund',
            'Guaranteed boost refund issued',
            jsonb_build_object(
                'boost_id', boost_record.id,
                'refund_amount', refund_amount,
                'guaranteed_views', boost_record.guaranteed_views,
                'actual_views', boost_record.actual_views
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate and record NFT revenue payouts
CREATE OR REPLACE FUNCTION calculate_nft_payouts(
    period_start_param TIMESTAMP,
    period_end_param TIMESTAMP
)
RETURNS void AS $$
DECLARE
    total_revenue DECIMAL(12,2);
    nft_record RECORD;
    nft_payout DECIMAL(10,4);
BEGIN
    -- Calculate total platform revenue for period
    SELECT COALESCE(SUM(total_revenue), 0) INTO total_revenue
    FROM (
        -- Subscription revenue
        SELECT SUM(amount) as total_revenue
        FROM payments
        WHERE status = 'succeeded'
        AND created_at BETWEEN period_start_param AND period_end_param
        
        UNION ALL
        
        -- Personalized video revenue
        SELECT SUM(price_usd) as total_revenue
        FROM personalized_video_orders
        WHERE status = 'completed'
        AND created_at BETWEEN period_start_param AND period_end_param
        
        UNION ALL
        
        -- Guaranteed boost revenue (minus refunds)
        SELECT SUM(price_usd) - COALESCE(SUM(refund_amount_usd), 0) as total_revenue
        FROM guaranteed_boosts
        WHERE created_at BETWEEN period_start_param AND period_end_param
        
        UNION ALL
        
        -- Shop revenue
        SELECT SUM(total_amount) as total_revenue
        FROM shop_orders
        WHERE status = 'completed'
        AND created_at BETWEEN period_start_param AND period_end_param
    ) revenue_sources;

    -- Create payout records for each active NFT
    FOR nft_record IN 
        SELECT id, revenue_share_percentage, owner_wallet
        FROM revenue_share_nfts
        WHERE is_active = true
    LOOP
        nft_payout := total_revenue * nft_record.revenue_share_percentage;
        
        INSERT INTO nft_revenue_payouts (
            nft_id,
            period_start,
            period_end,
            total_revenue_usd,
            nft_share_usd,
            payout_status
        ) VALUES (
            nft_record.id,
            period_start_param,
            period_end_param,
            total_revenue,
            nft_payout,
            'pending'
        );
        
        -- Update NFT total earnings
        UPDATE revenue_share_nfts
        SET total_earnings_usd = total_earnings_usd + nft_payout,
            last_payout_at = NOW()
        WHERE id = nft_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update boost view count in real-time
CREATE OR REPLACE FUNCTION update_boost_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE guaranteed_boosts
    SET actual_views = actual_views + 1
    WHERE id = NEW.boost_id;
    
    -- Check if guarantee met
    UPDATE guaranteed_boosts
    SET guarantee_met = true
    WHERE id = NEW.boost_id
    AND actual_views >= guaranteed_views
    AND guarantee_met = false;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_boost_views
AFTER INSERT ON boost_analytics
FOR EACH ROW
EXECUTE FUNCTION update_boost_view_count();

-- Trigger: Update viral campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE viral_content_campaigns
    SET total_impressions = (
            SELECT COALESCE(SUM(impressions), 0)
            FROM viral_content_posts
            WHERE campaign_id = NEW.campaign_id
        ),
        total_clicks = (
            SELECT COALESCE(SUM(clicks), 0)
            FROM viral_content_posts
            WHERE campaign_id = NEW.campaign_id
        ),
        total_signups = (
            SELECT COALESCE(SUM(signups_attributed), 0)
            FROM viral_content_posts
            WHERE campaign_id = NEW.campaign_id
        ),
        revenue_generated_usd = (
            SELECT COALESCE(SUM(revenue_attributed_usd), 0)
            FROM viral_content_posts
            WHERE campaign_id = NEW.campaign_id
        ),
        last_post_at = NEW.posted_at
    WHERE id = NEW.campaign_id;
    
    -- Calculate ROI
    UPDATE viral_content_campaigns
    SET roi_percentage = CASE
        WHEN total_impressions > 0 THEN
            ((revenue_generated_usd / (total_impressions * 0.001)) - 1) * 100
        ELSE 0
    END
    WHERE id = NEW.campaign_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_campaign_stats
AFTER INSERT OR UPDATE ON viral_content_posts
FOR EACH ROW
EXECUTE FUNCTION update_campaign_stats();

-- View: Revenue Dashboard (real-time analytics)
CREATE OR REPLACE VIEW revenue_dashboard AS
SELECT
    -- Personalized Videos
    (SELECT COALESCE(SUM(price_usd), 0) FROM personalized_video_orders WHERE status = 'completed') as video_revenue_total,
    (SELECT COUNT(*) FROM personalized_video_orders WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days') as videos_last_30d,
    
    -- Guaranteed Boosts
    (SELECT COALESCE(SUM(price_usd) - COALESCE(SUM(refund_amount_usd), 0), 0) FROM guaranteed_boosts) as boost_revenue_total,
    (SELECT COUNT(*) FROM guaranteed_boosts WHERE guarantee_met = true) as boosts_guarantee_met,
    (SELECT COUNT(*) FROM guaranteed_boosts WHERE refund_issued = true) as boosts_refunded,
    
    -- NFT Revenue Share
    (SELECT COALESCE(SUM(mint_price_usd), 0) FROM revenue_share_nfts) as nft_mint_revenue,
    (SELECT COUNT(*) FROM revenue_share_nfts WHERE is_active = true) as active_nfts,
    (SELECT COALESCE(SUM(total_earnings_usd), 0) FROM revenue_share_nfts) as nft_lifetime_payouts,
    
    -- Viral Content
    (SELECT COALESCE(SUM(revenue_generated_usd), 0) FROM viral_content_campaigns) as viral_revenue_total,
    (SELECT COALESCE(SUM(total_impressions), 0) FROM viral_content_campaigns) as viral_impressions_total,
    (SELECT COALESCE(SUM(total_signups), 0) FROM viral_content_campaigns) as viral_signups_total,
    
    -- Lottery
    (SELECT COUNT(*) FROM lottery_campaigns WHERE status = 'active') as active_lotteries,
    (SELECT COALESCE(SUM(entries_count), 0) FROM lottery_campaigns WHERE status = 'active') as total_lottery_entries,
    
    -- Overall
    (
        SELECT COALESCE(SUM(price_usd), 0) FROM personalized_video_orders WHERE status = 'completed'
    ) + (
        SELECT COALESCE(SUM(price_usd) - COALESCE(SUM(refund_amount_usd), 0), 0) FROM guaranteed_boosts
    ) + (
        SELECT COALESCE(SUM(mint_price_usd), 0) FROM revenue_share_nfts
    ) + (
        SELECT COALESCE(SUM(revenue_generated_usd), 0) FROM viral_content_campaigns
    ) as total_revenue_upgrades;
