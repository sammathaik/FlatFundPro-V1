/*
  # Update Marketing Leads Status Values

  1. Changes
    - Update the status column constraint to include new values:
      - 'new' (default) - Fresh lead just submitted
      - 'cold_lead' - Low priority/interest lead
      - 'hot_lead' - High priority/interest lead
      - 'approved_lead' - Lead approved for trial
      - 'contacted' - Lead has been contacted
      - 'converted' - Lead converted to customer
      - 'closed' - Lead closed/not interested
    
  2. Notes
    - This allows super admin to categorize and prioritize leads
    - Maintains backward compatibility with existing data
*/

-- Drop the existing constraint
ALTER TABLE marketing_leads 
DROP CONSTRAINT IF EXISTS marketing_leads_status_check;

-- Add new constraint with updated status values
ALTER TABLE marketing_leads
ADD CONSTRAINT marketing_leads_status_check 
CHECK (status IN (
  'new', 
  'cold_lead', 
  'hot_lead', 
  'approved_lead', 
  'contacted', 
  'converted', 
  'closed'
));

-- Update the default status to 'new' if not already set
ALTER TABLE marketing_leads 
ALTER COLUMN status SET DEFAULT 'new';
