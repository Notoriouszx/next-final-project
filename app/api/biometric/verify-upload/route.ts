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
    
    // Build payload with ALL three fields (matching your Python backend's expected format)
    const payload: any = {
      user_id: parseInt(userId, 10), // Convert to integer as your backend expects
      face_image: null,
      fingerprint_image: null,
      iris_image: null,
    };
    
    // Set the appropriate image based on biometric type
    if (biometricType === 'face') {
      payload.face_image = dataUrl;
    } else if (biometricType === 'fingerprint') {
      payload.fingerprint_image = dataUrl;
    } else if (biometricType === 'iris') {
      payload.iris_image = dataUrl;
    }
    
    // Get the API URL from environment
    const apiUrl = process.env.BIOMETRIC_VERIFY_URL || 
                   process.env.BIOMETRIC_API_URL + '/api/verify' ||
                   'https://biometric-auth-service.onrender.com/api/verify';
    
    console.log('Calling backend verify at:', apiUrl);
    console.log('Payload:', { ...payload, face_image: payload.face_image ? 'present' : null });
    
    // Call your Python backend
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const rawResponse = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(rawResponse);
    } catch {
      responseData = rawResponse;
    }
    
    if (!response.ok) {
      console.error('Backend error:', response.status, rawResponse);
      return NextResponse.json(
        {
          error: "Biometric service error",
          upstream: { url: apiUrl, status: response.status, body: rawResponse },
          hint: "Make sure your Python backend has the /api/verify endpoint and is running",
        },
        { status: 502 }
      );
    }
    
    // Return the response in the format your frontend expects
    return NextResponse.json({
      verified: responseData.verified || responseData.verified === true,
      confidence: responseData.confidence || 0,
      quality: responseData.quality || {},
      embedding: responseData.embedding,
      raw: responseData,
      upstream: { url: apiUrl },
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isConfig = /BIOMETRIC_VERIFY|BIOMETRIC_API_URL/i.test(message);
    console.error('Verification error:', error);
    return NextResponse.json({ error: message }, { status: isConfig ? 503 : 500 });
  }
}
