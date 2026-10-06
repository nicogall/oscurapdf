"""
Step 3 of 3. Exports ./model to ONNX and compresses it to 8 bits (135 MB, the size of the model it
replaces; measured on 2026-10-04: no loss against the 32-bit model). Writes the folder the app loads:

    optimum-cli export onnx --model model --task token-classification onnx-fp32
    python export.py            # -> pii-it-distilbert/ (config, tokenizer, onnx/model_quantized.onnx)

Copy that folder to public/models/oscurapdf/pii-it-distilbert and update the sizes and SHA-256 values in
tools/fetch-models/models.lock.json.
"""
import os, shutil
from onnxruntime.quantization import QuantType, quantize_dynamic

OUT = "pii-it-distilbert"
os.makedirs(f"{OUT}/onnx", exist_ok=True)
for name in ["config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"]:
    shutil.copy(f"onnx-fp32/{name}", OUT)
quantize_dynamic("onnx-fp32/model.onnx", f"{OUT}/onnx/model_quantized.onnx", weight_type=QuantType.QUInt8)
print(OUT, round(os.path.getsize(f"{OUT}/onnx/model_quantized.onnx") / 1e6, 1), "MB")
