-- Add nano_banana_2 to the allowed model values in the generations table
-- Required for the upgraded Kie.ai Nano Banana 2 image generation model

ALTER TABLE public.generations
  DROP CONSTRAINT IF EXISTS generations_model_check;

ALTER TABLE public.generations
  ADD CONSTRAINT generations_model_check
  CHECK (model IN ('nano_banana_pro', 'nano_banana_2', 'veo_3_1_fast', 'veo_3_1_standard', 'kling_2_6', 'kling_3_0', 'elevenlabs', 'heygen', 'claude'));
