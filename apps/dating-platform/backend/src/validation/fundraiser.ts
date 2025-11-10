import Joi from 'joi';

export const createFundraiserSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).required(),
  goal: Joi.number().min(1).required(),
});
