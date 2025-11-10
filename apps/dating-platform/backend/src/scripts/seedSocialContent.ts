/**
 * Social Content Pool Seeding Script
 * Populates the social_content_pool table with 50+ initial templates
 * for automated Twitter, Instagram, and Reddit posting
 */

import pool from '../database';
import logger from '../logger';

interface ContentTemplate {
  platform: 'twitter' | 'instagram' | 'reddit';
  content_type: 'post' | 'story' | 'poll';
  template: string;
  variables?: string[];
  hashtags?: string;
  media_url?: string;
  is_active?: boolean;
}

const contentTemplates: ContentTemplate[] = [
  // ============================================
  // TWITTER TEMPLATES (20 templates)
  // ============================================
  
  // Testimonials & Social Proof
  {
    platform: 'twitter',
    content_type: 'post',
    template: '💕 "Just matched with someone amazing on Trollz1004! This app actually works!" - One of our {{userCount}} happy users 🎉\n\nReady to find your match? Join now! 👇',
    variables: ['userCount'],
    hashtags: '#Dating #OnlineDating #Love',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🌟 Real success story: "I was skeptical about dating apps, but Trollz1004 changed everything. Met my partner here 6 months ago!" ❤️\n\nYour story could be next. Start today!',
    hashtags: '#SuccessStory #TrueLove #DatingApp',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '📊 Did you know? {{userCount}} people have already found meaningful connections on Trollz1004!\n\nWhat are you waiting for? 💘',
    variables: ['userCount'],
    hashtags: '#DatingStats #FindLove #Romance',
  },

  // Dating Tips & Value
  {
    platform: 'twitter',
    content_type: 'post',
    template: '💡 Dating Tip: Your profile photo is 10x more important than you think!\n\n✅ Natural lighting\n✅ Genuine smile\n✅ Clear face shot\n✅ Recent photo\n\nTrust us, it makes a difference! 📸',
    hashtags: '#DatingTips #ProfileTips #OnlineDating',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🎯 Pro tip: The best first message? Ask about something in their profile!\n\nGeneric "hey" = 10% response rate\nPersonalized question = 70% response rate\n\nBe genuine, be curious! 💬',
    hashtags: '#DatingAdvice #FirstMessage #OnlineDating',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '⚠️ Red flags to avoid:\n❌ No profile photo\n❌ Asks for money early\n❌ Won\'t video chat\n❌ Rushes to move off-app\n\nStay safe out there! Trollz1004 keeps your info secure 🔒',
    hashtags: '#SafetyFirst #DatingSafety #OnlineSafety',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🗓️ When\'s the best time to send that message?\n\nOur data shows:\n📈 Sunday evenings = highest response rates\n📈 Weekday lunchtimes = second best\n📉 Friday nights = everyone\'s busy!\n\nTiming matters! ⏰',
    hashtags: '#DatingScience #DataDriven #DatingTips',
  },

  // Engagement & Questions
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🤔 Quick poll for our community:\n\nWhat\'s more important on a first date?\n\n👍 Great conversation\n❤️ Physical chemistry\n🎭 Shared interests\n😂 Sense of humor\n\nDrop your thoughts below! 👇',
    hashtags: '#DatingPoll #FirstDate #Community',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '💭 Unpopular opinion: Coffee dates are underrated!\n\n☕ Low pressure\n☕ Easy to extend if going well\n☕ Easy to cut short if not\n☕ Daytime = safer\n\nAm I wrong? Let\'s debate! 👇',
    hashtags: '#DatingDebate #CoffeeDate #UnpopularOpinion',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🎮 Gamers! We see you 👀\n\nOver {{userCount}} profiles mention gaming as an interest.\n\nDrop your:\n🎯 Favorite game\n🎮 Platform\n👾 Gaming confession\n\nLet\'s connect! 🕹️',
    variables: ['userCount'],
    hashtags: '#GamerDating #Gaming #GeekLove',
  },

  // Stats & Milestones
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🎉 MILESTONE ALERT!\n\nTrollz1004 just hit {{userCount}} active users! 🚀\n\nThank you for making our community amazing! Every match, every conversation, every connection matters. ❤️',
    variables: ['userCount'],
    hashtags: '#Milestone #Community #Growth',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '📈 This week on Trollz1004:\n\n💌 {{todayMatches}} new matches made\n💬 Thousands of messages sent\n❤️ Countless smiles created\n\nYour success story could be next! Join the community 👇',
    variables: ['todayMatches'],
    hashtags: '#WeeklyStats #Success #Community',
  },

  // Humor & Light Content
  {
    platform: 'twitter',
    content_type: 'post',
    template: '😂 Dating app bio translation:\n\n"Fluent in sarcasm" = Will hurt your feelings\n"Love to travel" = Rich or in debt\n"Dog lover" = You\'ll be third priority\n"Gym enthusiast" = Will judge your diet\n\nWhat did we miss? 👇',
    hashtags: '#DatingHumor #FunnyButTrue #OnlineDating',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🎭 POV: You matched with someone cute but they take 8 hours to reply\n\nYou: "They\'re probably busy..."\nAlso you: *Checks app every 5 minutes*\n\nWe\'ve all been there! 😅',
    hashtags: '#DatingMemes #Relatable #POV',
  },

  // Features & Platform Updates
  {
    platform: 'twitter',
    content_type: 'post',
    template: '✨ Why choose Trollz1004?\n\n🔒 Privacy-first design\n🎯 Smart matching algorithm\n💎 Premium features that matter\n🛡️ Verified profiles\n❤️ Real people, real connections\n\nTry it free today!',
    hashtags: '#WhyTrollz1004 #DatingApp #Features',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🎁 Premium features worth it?\n\n✓ See who liked you\n✓ Unlimited swipes\n✓ Advanced filters\n✓ Priority matching\n✓ Incognito mode\n\nOur users say YES! Upgrade today for just $9.99/mo 💎',
    hashtags: '#Premium #Features #DatingApp',
  },

  // Call-to-Action Posts
  {
    platform: 'twitter',
    content_type: 'post',
    template: '⏰ Still single? Not for long!\n\nJoin {{userCount}}+ people finding love on Trollz1004:\n\n1️⃣ Create profile (2 min)\n2️⃣ Add photos\n3️⃣ Start matching\n4️⃣ Find your person ❤️\n\nSign up now! 👇',
    variables: ['userCount'],
    hashtags: '#JoinNow #FindLove #DatingApp',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '💘 Love doesn\'t have to be complicated.\n\n✨ Real profiles\n✨ Real conversations\n✨ Real connections\n\nTrollz1004 makes dating simple again. Join today! 🌟',
    hashtags: '#SimpleDating #RealLove #Authentic',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🌈 Finding love in 2025 hits different when you\'re on the right app.\n\nJoin Trollz1004 and see why our community is different. Your person is waiting! 💕',
    hashtags: '#ModernDating #2025Dating #FindYourPerson',
  },
  {
    platform: 'twitter',
    content_type: 'post',
    template: '🎯 New year, new connections!\n\nReady to stop swiping and start connecting? Trollz1004 helps you find quality matches, not just quantity.\n\nTry it free! Link in bio 👆',
    hashtags: '#NewYearNewLove #QualityOverQuantity #Dating2025',
  },

  // ============================================
  // INSTAGRAM STORY TEMPLATES (20 templates)
  // ============================================

  {
    platform: 'instagram',
    content_type: 'story',
    template: '💕 Success Story Alert!\n\n"Met my soulmate on Trollz1004 3 months ago. We\'re now planning our future together!" - Sarah & Mike\n\nYour story could be next! Swipe up to join! ✨',
    hashtags: '#SuccessStory #Love',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🎯 Dating Tip of the Day:\n\nYour bio should be:\n✅ Authentic\n✅ Positive\n✅ Specific\n❌ Generic\n\nShow your personality! 🌟',
    hashtags: '#DatingTips #ProfileTips',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '📊 Poll Time! 🤔\n\n[POLL STICKER]\nWhat\'s your ideal first date?\n🍕 Dinner & drinks\n☕ Coffee chat\n🎬 Movie night\n🎨 Creative activity\n\nVote now! 👆',
    hashtags: '#DatingPoll #FirstDate',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '⚡ Quick Stat:\n\n{{userCount}}+ active users on Trollz1004!\n\nYour perfect match might be just a swipe away... 💘\n\nJoin the community! Link in bio 👆',
    variables: ['userCount'],
    hashtags: '#DatingStats #Community',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🌟 Monday Motivation:\n\n"The best time to find love was yesterday. The second best time is now."\n\nStart your journey today! Swipe up! 💕',
    hashtags: '#MondayMotivation #FindLove',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🔥 This Week\'s Highlights:\n\n💌 {{todayMatches}} new matches\n❤️ Thousands of messages\n✨ Countless connections\n\nBe part of the magic! Join Trollz1004 👆',
    variables: ['todayMatches'],
    hashtags: '#WeeklyStats #Love',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '💡 Did You Know?\n\nProfiles with 4+ photos get 3x more matches!\n\nShow different sides of you:\n📸 Clear face shot\n🎨 Hobby photo\n🌍 Travel pic\n👥 With friends\n\nUpdate your profile now! ✨',
    hashtags: '#ProfileTips #DatingAdvice',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🎮 Calling all gamers! 🕹️\n\nLooking for a player 2?\n\nTrollz1004 has a huge gaming community ready to match!\n\nSwipe up to join! 👆',
    hashtags: '#GamerDating #FindYourPlayer2',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '⏰ Friday Feels!\n\nWeekend plans? 🎉\n\nMaybe your next date is just a match away...\n\nJoin Trollz1004 and see! 😉',
    hashtags: '#FridayVibes #WeekendPlans',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🌹 Real Talk:\n\nOnline dating works when you:\n✓ Be yourself\n✓ Stay positive\n✓ Keep trying\n✓ Have fun\n\nTrollz1004 makes it easy! Link in bio 💕',
    hashtags: '#RealTalk #DatingAdvice',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🎁 Premium Perks:\n\n💎 See who liked you\n💎 Unlimited matches\n💎 Advanced filters\n💎 Priority support\n\nUpgrade for $9.99/mo! Swipe up! 👆',
    hashtags: '#Premium #UpgradeNow',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '😂 Dating Humor:\n\n"Online dating is easy!"\n- Someone who\'s never tried it\n\nBut with Trollz1004, it actually can be! 🎯\n\nSmart matching = Better dates ✨',
    hashtags: '#DatingHumor #SmartMatching',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '❤️ Love Language Check!\n\n[POLL STICKER]\nWhat\'s yours?\n💌 Words of affirmation\n🎁 Gifts\n⏰ Quality time\n🤝 Acts of service\n💕 Physical touch\n\nShare yours! 👆',
    hashtags: '#LoveLanguage #Poll',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🌈 Be Yourself:\n\nAuthenticity is attractive! 🌟\n\nOn Trollz1004:\n✓ Be real\n✓ Be honest\n✓ Be you\n\nThe right person will love the real you! 💕',
    hashtags: '#BeYourself #Authentic',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🔒 Safety First!\n\nTrollz1004 features:\n✅ Profile verification\n✅ Report & block tools\n✅ Privacy controls\n✅ Secure messaging\n\nDate safely! 🛡️',
    hashtags: '#SafetyFirst #SecureDating',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '💪 Confidence Boost:\n\nYou are:\n✨ Worthy of love\n✨ Deserving of respect\n✨ Enough as you are\n\nNow go get that match! 🎯',
    hashtags: '#Confidence #SelfLove',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '📱 App Update:\n\nNew features just dropped!\n🎉 Faster matching\n🎉 Better filters\n🎉 Smoother experience\n\nUpdate now & check it out! 👆',
    hashtags: '#AppUpdate #NewFeatures',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🎯 Success Formula:\n\nGreat Profile\n+ Active Engagement\n+ Positive Attitude\n= Amazing Matches!\n\nIt\'s that simple on Trollz1004! ✨',
    hashtags: '#SuccessFormula #FindLove',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '🌟 Weekend Vibes:\n\nSunday is for:\n☕ Self-care\n📱 Updating your profile\n💘 Finding new matches\n\nMake today count! Swipe up! 👆',
    hashtags: '#SundayVibes #SelfCare',
  },
  {
    platform: 'instagram',
    content_type: 'story',
    template: '💕 Join the Movement!\n\n{{userCount}}+ people choosing quality connections over endless swiping.\n\nBe part of something real. Join Trollz1004! 🌟',
    variables: ['userCount'],
    hashtags: '#JoinUs #RealConnections',
  },

  // ============================================
  // REDDIT POST TEMPLATES (15 templates)
  // ============================================

  {
    platform: 'reddit',
    content_type: 'post',
    template: '**[Success Story] Met my partner on a dating app and couldn\'t be happier!**\n\nHey everyone! I wanted to share some positivity in this sub. After months of trying different dating apps, I finally found someone amazing on Trollz1004.\n\nWhat worked for me:\n- Being authentic in my profile\n- Taking time to write thoughtful messages\n- Not giving up after bad dates\n- Focusing on genuine connection over looks\n\nTo anyone feeling discouraged: it can work! Keep trying and stay positive. Your person is out there. ❤️\n\nHappy to answer questions!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Profile photo tips that actually helped me get more matches**\n\nAfter months of trial and error, here\'s what I learned:\n\n**Do:**\n- Use natural lighting (golden hour is best)\n- Show your genuine smile\n- Include full body shot (people want to see you)\n- Add photos of you doing hobbies\n- Make sure photos are recent (within 6 months)\n\n**Don\'t:**\n- Heavy filters (people will notice in person)\n- Group photos only (which one are you?)\n- Mirror selfies with dirty room\n- Sunglasses in every photo\n- Photos with ex (crop them out!)\n\nI changed my photos following this advice and matches went up 3x. Hope this helps someone!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**First message tips from someone who actually gets responses**\n\nI\'ve been online dating for a while and noticed my response rate went from ~10% to ~70% after changing my approach.\n\n**What works:**\n1. Read their full profile\n2. Reference something specific they mentioned\n3. Ask an open-ended question\n4. Show personality, not just "hey"\n5. Keep it short (3-4 sentences max)\n\n**Example:**\n"I saw you\'re into hiking! That trail photo looks amazing. What\'s your favorite hike in the area? I\'m always looking for new spots to explore."\n\n**Doesn\'t work:**\n- "Hey"\n- "You\'re beautiful"\n- Copy-paste pickup lines\n- Novel-length messages\n\nBe genuine, be curious, be yourself. Good luck out there!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Red flags I learned to spot early (the hard way)**\n\nAfter some rough experiences, here are the red flags I now watch for:\n\n🚩 Won\'t video chat before meeting\n🚩 Asks for money/gift cards\n🚩 Pushy about moving to different platform immediately\n🚩 Profile photos look professionally modeled\n🚩 Story doesn\'t add up or keeps changing\n🚩 Love bombing (too much too soon)\n🚩 Won\'t share social media at all\n🚩 Always has an excuse not to meet\n\n**Green flags:**\n✅ Suggests public first meeting\n✅ Respectful of boundaries\n✅ Profile feels authentic\n✅ Willing to video chat\n✅ Takes time to know you\n\nStay safe everyone! Trust your gut.',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Analysis: Why Sunday evenings are the best time to send messages**\n\nI tracked my messages over 3 months and found something interesting:\n\n**Response rates by day/time:**\n- Sunday 6-10pm: 71% response rate\n- Weekday lunch (12-1pm): 58% response rate\n- Friday/Saturday night: 23% response rate\n- Early morning (6-9am): 31% response rate\n\n**Theory:** Sunday evening people are:\n- Winding down from weekend\n- Checking their phone more\n- Planning for the week\n- More responsive\n\nFriday/Saturday everyone\'s busy actually doing things!\n\nAnyone else notice timing patterns? Would love to hear others\' data!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Honest review of Trollz1004 after 2 months of use**\n\nFigured I\'d share my experience since this sub helped me a lot.\n\n**Pros:**\n- Clean, easy to use interface\n- Good matching algorithm (actual compatible people)\n- Reasonable pricing ($9.99/mo premium)\n- Verified profiles reduce catfishing\n- Privacy features are solid\n- Good user base in my area\n\n**Cons:**\n- Smaller than Tinder/Bumble (but growing)\n- Some features require premium\n- Could use more filters\n\n**Results:**\n- 15 quality matches in 2 months\n- 8 good conversations\n- 3 dates (2 second dates)\n- Currently seeing someone I really like!\n\n**Verdict:** 8/10 - Best app I\'ve tried for actual relationships vs hookups.\n\nAMA if you have questions!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Coffee dates are underrated - here\'s why**\n\nUnpopular opinion maybe, but coffee dates are the perfect first date:\n\n**Pros:**\n- Low pressure environment\n- Daytime = safer\n- Easy to extend if going well\n- Easy to politely end if not clicking\n- Inexpensive (no one feels used)\n- Can actually talk and hear each other\n- Public place\n\n**Why dinner dates as first dates are tough:**\n- Expensive if it\'s not working\n- Hard to leave early\n- Trapped for 1-2 hours minimum\n- Alcohol can complicate things\n\nSave the fancy dinner for date 2-3 when you know there\'s chemistry!\n\nCMV?',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**For everyone feeling discouraged: my timeline**\n\nSeeing a lot of negativity lately. Just want to share that it CAN work:\n\n- Month 1-2: No matches, felt hopeless\n- Month 3: Fixed profile, got better photos\n- Month 4: Started getting matches, bad first dates\n- Month 5: Learned what I want, better conversations\n- Month 6: Met several nice people\n- Month 7: Found someone special\n\n**What I learned:**\n1. Your profile matters MORE than you think\n2. It\'s a numbers game, but quality > quantity\n3. Bad dates teach you what you want\n4. Patience and positivity attract people\n5. Being yourself filters out wrong matches\n\nDon\'t give up. Your person is out there looking for you too. ❤️',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**PSA: Please stop doing these things in your bio**\n\nAs someone who reviews hundreds of profiles:\n\n❌ "Don\'t know why I\'m here" - why would I match with you then?\n❌ "Just ask" as your entire bio - give me something to work with!\n❌ "Fluent in sarcasm" - everyone says this\n❌ "Not like other girls/guys" - this is a red flag now\n❌ Listing demands before saying anything about yourself\n❌ "Venmo me and see what happens" - instant left swipe\n❌ Nothing but emojis\n\n✅ DO: Share your interests, what you\'re looking for, conversation starters\n\nYour bio is your first impression. Make it count!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Data shows: Profiles with these get 3x more matches**\n\nI analyzed 1000+ successful profiles. Patterns:\n\n**Profile elements that boost matches:**\n1. 4-6 photos (not 1, not 20)\n2. At least one full body photo\n3. Photo doing an interesting activity\n4. Genuine smile in main photo\n5. Bio 50-150 words (not empty, not novel)\n6. Specific interests mentioned\n7. Conversation hooks/questions\n8. Positive tone (no "no drama" or demands)\n\n**What doesn\'t matter as much:**\n- Being extremely good looking (personality shows through)\n- Exotic locations (local coffee shop is fine)\n- Professional photos (authentic > professional)\n\nIt\'s not about being perfect, it\'s about being YOU authentically!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**How I went from anxious to confident in online dating**\n\nUsed to get so anxious about every message, every match. Here\'s what helped:\n\n**Mindset shifts:**\n1. Not every match needs to be "the one"\n2. Rejection isn\'t personal (you don\'t click with everyone IRL either)\n3. It\'s practice - every conversation makes you better\n4. Focus on fun, not outcome\n5. Their loss if they don\'t see your value\n\n**Practical tips:**\n- Set time limits on app (don\'t obsess)\n- Remember they\'re probably nervous too\n- First date is just to see if there\'s chemistry\n- Keep expectations realistic\n- Take breaks when needed\n\nOnline dating should be fun, not stressful. Hope this helps someone!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**The "wait 3 days to text" rule is dead. Here\'s what works now:**\n\nOld dating advice doesn\'t apply to modern dating. Real talk:\n\n**After a good first date:**\n✅ Text that same night: "Had a great time! Let\'s do it again soon"\n✅ Shows you\'re interested and confident\n✅ No one wants to play games anymore\n\n**Why "playing hard to get" fails:**\n❌ They think you\'re not interested\n❌ They match with someone else\n❌ Comes across as game-playing\n❌ Adults appreciate direct communication\n\n**BUT:**\n- Don\'t be desperate or pushy\n- Give them space to respond\n- Match their energy level\n- Be genuine\n\nBe yourself, communicate clearly, and you\'ll find someone who appreciates that. Simple.',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Safety tips that should be obvious but apparently aren\'t**\n\nPlease, PLEASE follow these for first dates:\n\n**Must do:**\n1. Meet in public place\n2. Tell a friend where you\'re going + who you\'re meeting\n3. Have your own transportation\n4. Video chat before meeting (verify they\'re real)\n5. Google their name/reverse image search\n6. Trust your gut - if something feels off, it probably is\n7. Keep your drink with you always\n\n**Red flags to bail:**\n- Pressures you to meet privately\n- Won\'t video chat beforehand\n- Story keeps changing\n- Love bombing (too intense too fast)\n- Disrespects your boundaries\n\n**Use apps with:**\n- Profile verification\n- In-app video chat\n- Report features\n\nStay safe out there! Your safety > potentially offending someone.',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**Why I switched to Trollz1004 from Tinder/Bumble**\n\nNot sponsored, just sharing my experience:\n\n**Why I left Tinder/Bumble:**\n- 90% looking for hookups (I want relationship)\n- Algorithm pushes you to pay\n- Same people recycling for years\n- Felt like product, not person\n- Exhausting swipe culture\n\n**What I like about Trollz1004:**\n- Smaller pool = higher quality matches\n- People actually fill out profiles\n- Matching algorithm works better\n- Less hookup culture\n- Privacy controls\n- Reasonable pricing\n- People actually respond to messages\n\n**Results:**\n- Better conversation quality\n- More genuine connections\n- Actually excited to check messages\n- Currently dating someone I really like\n\nSometimes smaller/newer apps work better than the big ones. YMMV but worth trying!',
  },
  {
    platform: 'reddit',
    content_type: 'post',
    template: '**What I wish I knew before starting online dating**\n\nFor anyone new to this:\n\n**Expectations vs Reality:**\n\n❌ Myth: "I\'ll find someone in a week"\n✅ Reality: Takes time, be patient\n\n❌ Myth: "Looks are everything"\n✅ Reality: Personality + photos + bio all matter\n\n❌ Myth: "More matches = more success"\n✅ Reality: Quality > quantity always\n\n❌ Myth: "I need pickup lines"\n✅ Reality: Be genuine and reference their profile\n\n❌ Myth: "Everyone is fake/catfishing"\n✅ Reality: Most people are real, use video chat\n\n**Best advice:**\n1. Be yourself\n2. Stay positive\n3. Learn from each experience\n4. Take breaks when overwhelmed\n5. It only takes one right person\n\nGood luck! It\'s a journey, not a race. ❤️',
  },
];

/**
 * Seed the social content pool with initial templates
 */
const seedContentPool = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    logger.info('Starting social content pool seeding...');

    await client.query('BEGIN');

    // Clear existing content (optional - comment out if you want to keep existing)
    // await client.query('DELETE FROM social_content_pool');
    // logger.info('Cleared existing content pool');

    let insertedCount = 0;

    for (const template of contentTemplates) {
      const query = `
        INSERT INTO social_content_pool (
          platform,
          content_type,
          template,
          variables,
          hashtags,
          media_url,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `;

      await client.query(query, [
        template.platform,
        template.content_type,
        template.template,
        template.variables || [],
        template.hashtags || '',
        template.media_url || null,
        template.is_active !== undefined ? template.is_active : true,
      ]);

      insertedCount++;
    }

    await client.query('COMMIT');

    logger.info(`✅ Successfully seeded ${insertedCount} content templates!`);

    // Log summary by platform
    const summary = await client.query(`
      SELECT 
        platform,
        content_type,
        COUNT(*) as count
      FROM social_content_pool
      WHERE is_active = true
      GROUP BY platform, content_type
      ORDER BY platform, content_type
    `);

    console.log('\n📊 Content Pool Summary:');
    console.log('========================');
    summary.rows.forEach((row) => {
      console.log(`${row.platform.toUpperCase()} - ${row.content_type}: ${row.count} templates`);
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to seed content pool', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Main execution
 */
const main = async (): Promise<void> => {
  try {
    await seedContentPool();
    console.log('\n✨ Seeding complete! Your social content pool is ready.');
    console.log('💡 Run the automation worker to start posting automatically.\n');
    process.exit(0);
  } catch (error: any) {
    logger.error('Seeding failed', { error: error.message });
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

export { seedContentPool, contentTemplates };
