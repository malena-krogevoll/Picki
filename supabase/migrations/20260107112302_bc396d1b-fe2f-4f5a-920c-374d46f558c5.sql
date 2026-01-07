-- Update default preferences to include household_size
-- This is just for documentation, actual data will be updated when users save their profiles

-- Note: preferences is a JSONB column, so we don't need a migration for the schema
-- The application code will handle the new field