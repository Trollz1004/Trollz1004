-- Migration: 001_initial_schema
-- Description: Initial database schema for dating app
-- Applied: Run this migration first

\i '../schema.sql';

INSERT INTO _migrations (version) VALUES ('001_initial_schema');
