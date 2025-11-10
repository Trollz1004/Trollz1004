import Joi from 'joi';

export const sendNewsletterSchema = Joi.object({
  subject: Joi.string().min(3).max(100).required(),
  body: Joi.string().min(10).required(),
});
