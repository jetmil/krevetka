import requests
import json
import time
import os

session = requests.Session()
session.trust_env = False

COMFY_URL = "http://127.0.0.1:8190"
OUTPUT_DIR = "/var/www/krevetka/public/icons"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Базовый workflow для Qwen
def create_workflow(prompt_text, width, height, filename):
    return {
        "37": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors",
                "weight_dtype": "fp8_e4m3fn"
            }
        },
        "38": {
            "class_type": "CLIPLoader", 
            "inputs": {
                "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
                "type": "qwen_image"
            }
        },
        "73": {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "lora_name": "Qwen-Image-2512-Lightning-4steps-V1.0-bf16.safetensors",
                "strength_model": 1.0,
                "model": ["37", 0]
            }
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt_text,
                "clip": ["38", 0]
            }
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "blurry, low quality, text, watermark, signature, ugly, distorted",
                "clip": ["38", 0]
            }
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            }
        },
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": int(time.time() * 1000) % 2147483647,
                "steps": 4,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["73", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            }
        },
        "8": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": "qwen_image_vae.safetensors"
            }
        },
        "74": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["8", 0]
            }
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": filename,
                "images": ["74", 0]
            }
        }
    }

def generate_image(prompt, width, height, filename):
    print(f"Generating {filename} ({width}x{height})...")
    workflow = create_workflow(prompt, width, height, filename)
    
    response = session.post(f"{COMFY_URL}/prompt", json={"prompt": workflow})
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return None
    
    prompt_id = response.json()["prompt_id"]
    
    # Ждём завершения
    for _ in range(60):
        time.sleep(1)
        history = session.get(f"{COMFY_URL}/history/{prompt_id}").json()
        if prompt_id in history:
            outputs = history[prompt_id].get("outputs", {})
            if "9" in outputs and outputs["9"].get("images"):
                img_info = outputs["9"]["images"][0]
                print(f"  Done: {img_info['filename']}")
                return img_info["filename"]
    print("  Timeout!")
    return None

# Промпты
icon_prompt = """emoji style shrimp icon, 🦐 cute cartoon shrimp character, deep ocean dark blue gradient background, cyan bioluminescent glow, neon teal border effect, glassmorphism, centered composition, app icon design, vibrant colors, clean simple design, no text"""

snippet_prompt = """emoji style banner with cute shrimp 🦐 character, deep ocean underwater scene, dark blue gradient, cyan bioluminescent particles floating, neon glow effects, glassmorphism cards, mystical fortune telling theme, wide cinematic composition, vibrant teal and burgundy accents, no text"""

# Генерируем
results = []

# Главная иконка 576x576
results.append(generate_image(icon_prompt, 576, 576, "krevetka_icon_576"))

# Сниппет 1120x630
results.append(generate_image(snippet_prompt, 1120, 640, "krevetka_snippet"))

print("\nGenerated files:")
for r in results:
    if r:
        print(f"  /home/jetmil/comfyui/output/{r}")
