-- =============================================================================
-- AI CONTENT CREATOR MARKETPLACE - SEED DATA
-- Populate standard benchmark skills, skill tests, and demo reference rows
-- =============================================================================

-- 1. SEED SKILLS
INSERT INTO public.skills (id, name, category, description, weight) VALUES
    ('00000000-0000-0000-0001-000000000001', 'Prompt Engineering', 'Core AI Foundation', 'Mastery in designing, weighting, and iterating natural language prompts across LLMs and diffusion models.', 1.00),
    ('00000000-0000-0000-0001-000000000002', 'AI Video Generation', 'Video & Motion', 'Expertise in Runway Gen-3, Luma Dream Machine, Sora, and Pika for coherent commercial video sequences.', 1.00),
    ('00000000-0000-0000-0001-000000000003', 'LoRA & Model Fine-Tuning', 'Model Training', 'Capability in training custom Low-Rank Adaptation checkpoints on proprietary character faces and product lines.', 1.20),
    ('00000000-0000-0000-0001-000000000004', 'Virtual Avatar Synthesizing', 'Character Design', 'Creating lifelike, photorealistic AI personalities with persistent facial landmarks and micro-expressions.', 1.10),
    ('00000000-0000-0000-0001-000000000005', 'Voice Cloning & Audio Generation', 'Audio & Speech', 'High-fidelity audio synthesis, emotional cadence mapping, and lip-sync synchronization using ElevenLabs.', 0.90)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- 2. SEED SKILL TESTS
INSERT INTO public.skill_tests (id, skill_id, title, description, difficulty, passing_score, duration_minutes, questions, rubric) VALUES
    (
        '00000000-0000-0000-0002-000000000001',
        '00000000-0000-0000-0001-000000000001',
        'Advanced Diffusion Prompt Engineering Assessment',
        'Evaluate prompt token weighting, negative prompt discipline, aspect ratio tokens, and seed consistency.',
        'advanced',
        80.00,
        35,
        '[
            {
                "id": "q1",
                "type": "multiple_choice",
                "question": "In diffusion models, how does increasing CFG (Classifier-Free Guidance) scale above 12 typically affect photorealistic skin render outputs?",
                "options": [
                    "Introduces high contrast, oversaturation, and burned artifact edges",
                    "Reduces rendering resolution automatically",
                    "Increases semantic drift and changes composition completely",
                    "Smooths skin tones to look like anime illustrations"
                ],
                "correct_option_index": 0
            },
            {
                "id": "q2",
                "type": "multiple_choice",
                "question": "Which negative prompt token sequence most effectively prevents warped hands without wiping out stylistic anatomy?",
                "options": [
                    "bad hands, extra fingers, missing digits, mutated, fused fingers",
                    "no hands, erase body parts, cartoon, ugly",
                    "random noise, grain, lowres, monochrome",
                    "blurry, dark, low light"
                ],
                "correct_option_index": 0
            },
            {
                "id": "q3",
                "type": "prompt_challenge",
                "prompt_target": "Write an enterprise luxury skincare commercial prompt with volumetric lighting, 85mm macro lens, droplets, and clean white aesthetics.",
                "min_tokens": 15
            }
        ]'::jsonb,
        '{"accuracy_weight": 0.5, "creativity_weight": 0.3, "token_discipline_weight": 0.2}'::jsonb
    ),
    (
        '00000000-0000-0000-0002-000000000002',
        '00000000-0000-0000-0001-000000000002',
        'AI Video Motion & Temporal Consistency Benchmark',
        'Assess motion brush accuracy, camera motion syntax, and temporal morphing elimination in Runway Gen-3/Luma.',
        'advanced',
        85.00,
        45,
        '[
            {
                "id": "v1",
                "type": "multiple_choice",
                "question": "What is the primary method to maintain brand packaging typography stability across a 6-second generative video shot?",
                "options": [
                    "Using first-frame image conditioning with zero camera rotation speed and localized motion brush",
                    "Increasing motion rate to 10 for faster camera pans",
                    "Adding text keywords in uppercase in the prompt",
                    "Extending the clip to 10 seconds directly without interpolation"
                ],
                "correct_option_index": 0
            }
        ]'::jsonb,
        '{"temporal_stability_weight": 0.6, "cinematography_weight": 0.4}'::jsonb
    )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    questions = EXCLUDED.questions;
