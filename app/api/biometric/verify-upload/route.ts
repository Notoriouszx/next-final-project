// app/api/biometric/verify-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fileToDataUrl } from "@/lib/biometric-verify-service";

const formSchema = z.object({
  userId: z.string().min(1),
  biometricType: z.enum(["face", "iris", "fingerprint"]),
});

export async function POST(request: NextRequest) {
  try {
    const fd = await request.formData();
    const userId = String(fd.get("userId") ?? "");
    const biometricType = String(fd.get("biometricType") ?? "");

    const parsed = formSchema.safeParse({ userId, biometricType });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const files = fd.getAll("files").filter((v): v is File => v instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Convert the file to base64 data URL
    const dataUrl = await fileToDataUrl(files[0]);
    
    // Map frontend biometric type to backend expected format
    const biometricTypeMap = {
      'face': 'face',
      'fingerprint': 'fingerprint',
      'iris': 'iris'
    };
    
    const mappedType = biometricTypeMap[parsed.data.biometricType];
    
    // Build payload for single-modality verification
    // Option A: If your backend has a single-modality endpoint
    const apiUrl = process.env.BIOMETRIC_SINGLE_VERIFY_URL || 
                   `${process.env.BIOMETRIC_API_URL}/api/verify-single`;
    
    const payload = {
      user_id: parseInt(userId, 10),
      biometric_type: mappedType,
      image: dataUrl
    };
    
    console.log(`Verifying ${mappedType} for user ${userId}`);
    console.log('Calling:', apiUrl);
    
    // Set timeout to 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }
      
      if (!response.ok) {
        console.error(`Backend error (${response.status}):`, responseText);
        
        // If single-modality endpoint doesn't exist, try multi-modal with nulls
        if (response.status === 404) {
          console.log('Single-modality endpoint not found, trying multi-modal...');
          
          // Fallback to multi-modal endpoint with only one image
          const multiModalPayload: any = {
            user_id: parseInt(userId, 10),
            face_image: null,
            fingerprint_image: null,
            iris_image: null,
          };
          
          if (mappedType === 'face') multiModalPayload.face_image = dataUrl;
          else if (mappedType === 'fingerprint') multiModalPayload.fingerprint_image = dataUrl;
          else if (mappedType === 'iris') multiModalPayload.iris_image = dataUrl;
          
          const fallbackResponse = await fetch(
            `${process.env.BIOMETRIC_API_URL}/api/verify`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(multiModalPayload),
            }
          );
          
          const fallbackData = await fallbackResponse.json();
          
          return NextResponse.json({
            verified: fallbackData.verified,
            confidence: fallbackData.confidence || 0,
            quality: fallbackData.scores || {},
            raw: fallbackData,
            upstream: { url: `${process.env.BIOMETRIC_API_URL}/api/verify` },
          });
        }
        
        return NextResponse.json(
          {
            error: "Biometric service error",
            upstream: { url: apiUrl, status: response.status, body: responseText },
          },
          { status: 502 }
        );
      }
      
      return NextResponse.json({
        verified: responseData.verified,
        confidence: responseData.confidence || 0,
        quality: responseData.quality || {},
        raw: responseData,
        upstream: { url: apiUrl },
      });
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: "Request timeout - backend service took too long to respond" },
          { status: 504 }
        );
      }
      throw fetchError;
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isConfig = /BIOMETRIC_VERIFY|BIOMETRIC_API_URL/i.test(message);
    console.error('Verification error:', error);
    return NextResponse.json({ error: message }, { status: isConfig ? 503 : 500 });
  }
}
