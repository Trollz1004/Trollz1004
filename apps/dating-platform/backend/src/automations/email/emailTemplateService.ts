import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';

/**
 * Email template data structure
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subjectLine: string;
  htmlContent: string;
  plainTextContent: string | null;
  variables: string[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template cache for performance
 * Key: template name, Value: template object
 */
const templateCache: Map<string, EmailTemplate> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cacheLastUpdated = 0;

/**
 * Load all active email templates from database
 * 
 * @returns Promise<EmailTemplate[]>
 */
export const loadTemplates = async (): Promise<EmailTemplate[]> => {
  try {
    const result = await pool.query(
      `SELECT id, name, subject_line, html_content, plain_text_content, variables, is_active, created_at, updated_at
       FROM email_templates
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );

    const templates: EmailTemplate[] = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      subjectLine: row.subject_line,
      htmlContent: row.html_content,
      plainTextContent: row.plain_text_content,
      variables: row.variables,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Update cache
    templateCache.clear();
    templates.forEach((template) => {
      templateCache.set(template.name, template);
    });
    cacheLastUpdated = Date.now();

    logger.debug(`Loaded ${templates.length} email templates into cache`);
    return templates;
  } catch (error: any) {
    logger.error('Failed to load email templates', { error: error.message });
    throw new Error(`Failed to load email templates: ${error.message}`);
  }
};

/**
 * Get template by name (with caching)
 * 
 * @param templateName - Name of the template
 * @returns Promise<EmailTemplate | null>
 */
export const getTemplateByName = async (templateName: string): Promise<EmailTemplate | null> => {
  try {
    // Check cache first
    const now = Date.now();
    if (templateCache.has(templateName) && (now - cacheLastUpdated) < CACHE_TTL_MS) {
      logger.debug(`Template ${templateName} served from cache`);
      return templateCache.get(templateName)!;
    }

    // Cache miss or expired - reload from database
    logger.debug(`Cache miss for template ${templateName}, reloading from database`);
    const result = await pool.query(
      `SELECT id, name, subject_line, html_content, plain_text_content, variables, is_active, created_at, updated_at
       FROM email_templates
       WHERE name = $1 AND is_active = TRUE`,
      [templateName]
    );

    if (result.rows.length === 0) {
      logger.warn(`Template ${templateName} not found`);
      return null;
    }

    const row = result.rows[0];
    const template: EmailTemplate = {
      id: row.id,
      name: row.name,
      subjectLine: row.subject_line,
      htmlContent: row.html_content,
      plainTextContent: row.plain_text_content,
      variables: row.variables,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Update cache
    templateCache.set(templateName, template);

    return template;
  } catch (error: any) {
    logger.error(`Failed to get template ${templateName}`, { error: error.message });
    throw new Error(`Failed to get template: ${error.message}`);
  }
};

/**
 * Render template with variables
 * Replaces {{variableName}} with actual values
 * 
 * @param template - Email template
 * @param variables - Object with variable values
 * @returns Rendered HTML and plain text content
 */
export const renderTemplate = (
  template: EmailTemplate,
  variables: Record<string, any>
): { htmlContent: string; plainTextContent: string; subjectLine: string } => {
  try {
    let htmlContent = template.htmlContent;
    let plainTextContent = template.plainTextContent || '';
    let subjectLine = template.subjectLine;

    // Replace all variables in format {{variableName}}
    Object.keys(variables).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const value = String(variables[key] || '');

      htmlContent = htmlContent.replace(placeholder, value);
      plainTextContent = plainTextContent.replace(placeholder, value);
      subjectLine = subjectLine.replace(placeholder, value);
    });

    // Check for unreplaced variables (debugging)
    const unreplacedHtml = htmlContent.match(/{{[^}]+}}/g);
    const unreplacedPlain = plainTextContent.match(/{{[^}]+}}/g);
    if (unreplacedHtml || unreplacedPlain) {
      logger.warn(`Template ${template.name} has unreplaced variables`, {
        unreplacedHtml,
        unreplacedPlain,
      });
    }

    return {
      htmlContent,
      plainTextContent,
      subjectLine,
    };
  } catch (error: any) {
    logger.error(`Failed to render template ${template.name}`, { error: error.message });
    throw new Error(`Failed to render template: ${error.message}`);
  }
};

/**
 * Validate template structure
 * Ensures required fields are present
 * 
 * @param template - Email template to validate
 * @returns True if valid, throws error if invalid
 */
export const validateTemplate = (template: Partial<EmailTemplate>): boolean => {
  const errors: string[] = [];

  if (!template.name || template.name.trim() === '') {
    errors.push('Template name is required');
  }

  if (!template.subjectLine || template.subjectLine.trim() === '') {
    errors.push('Subject line is required');
  }

  if (!template.htmlContent || template.htmlContent.trim() === '') {
    errors.push('HTML content is required');
  }

  // Check for valid HTML structure (basic check)
  if (template.htmlContent && !template.htmlContent.includes('<html')) {
    logger.warn(`Template ${template.name} missing <html> tag`);
  }

  if (errors.length > 0) {
    const errorMessage = `Template validation failed: ${errors.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  return true;
};

/**
 * Create or update email template
 * 
 * @param template - Template data
 * @returns Promise<EmailTemplate>
 */
export const upsertTemplate = async (template: Partial<EmailTemplate>): Promise<EmailTemplate> => {
  try {
    // Validate template
    validateTemplate(template);

    const result = await pool.query(
      `INSERT INTO email_templates (name, subject_line, html_content, plain_text_content, variables, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name)
       DO UPDATE SET
         subject_line = EXCLUDED.subject_line,
         html_content = EXCLUDED.html_content,
         plain_text_content = EXCLUDED.plain_text_content,
         variables = EXCLUDED.variables,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING id, name, subject_line, html_content, plain_text_content, variables, is_active, created_at, updated_at`,
      [
        template.name,
        template.subjectLine,
        template.htmlContent,
        template.plainTextContent || null,
        JSON.stringify(template.variables || []),
        template.isActive !== undefined ? template.isActive : true,
      ]
    );

    const row = result.rows[0];
    const createdTemplate: EmailTemplate = {
      id: row.id,
      name: row.name,
      subjectLine: row.subject_line,
      htmlContent: row.html_content,
      plainTextContent: row.plain_text_content,
      variables: row.variables,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Invalidate cache
    templateCache.delete(template.name!);

    await logAutomation({
      service: 'email_template_service',
      action: 'upsert_template',
      status: 'success',
      details: { templateName: template.name },
    });

    logger.info(`Template ${template.name} upserted successfully`);
    return createdTemplate;
  } catch (error: any) {
    await logAutomation({
      service: 'email_template_service',
      action: 'upsert_template',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error(`Failed to upsert template ${template.name}`, { error: error.message });
    throw error;
  }
};

/**
 * Delete email template (soft delete by setting is_active = false)
 * 
 * @param templateName - Name of template to delete
 * @returns Promise<boolean>
 */
export const deleteTemplate = async (templateName: string): Promise<boolean> => {
  try {
    await pool.query(
      `UPDATE email_templates
       SET is_active = FALSE, updated_at = NOW()
       WHERE name = $1`,
      [templateName]
    );

    // Remove from cache
    templateCache.delete(templateName);

    await logAutomation({
      service: 'email_template_service',
      action: 'delete_template',
      status: 'success',
      details: { templateName },
    });

    logger.info(`Template ${templateName} deleted (deactivated)`);
    return true;
  } catch (error: any) {
    await logAutomation({
      service: 'email_template_service',
      action: 'delete_template',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error(`Failed to delete template ${templateName}`, { error: error.message });
    throw error;
  }
};

/**
 * Clear template cache
 * Use when templates are updated externally
 */
export const clearCache = (): void => {
  templateCache.clear();
  cacheLastUpdated = 0;
  logger.info('Template cache cleared');
};

/**
 * Get cache statistics
 * 
 * @returns Cache stats
 */
export const getCacheStats = (): { size: number; lastUpdated: number; ttlMs: number } => {
  return {
    size: templateCache.size,
    lastUpdated: cacheLastUpdated,
    ttlMs: CACHE_TTL_MS,
  };
};
