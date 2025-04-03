// Helper function to transcribe audio using OpenAI Whisper API
export const transcribeAudioWithWhisper = async (audioBlob, mimeType) => { // Accept mimeType explicitly
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        console.error("OpenAI API key not found. Make sure VITE_OPENAI_API_KEY is set in your .env file.");
        throw new Error("API key not configured.");
    }

    // Check file size before creating FormData
    if (audioBlob.size > 25 * 1024 * 1024) {
         console.error(`Audio file size (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB) exceeds the 25MB limit.`);
         throw new Error("Audio file is too large (max 25MB).");
    }
    if (audioBlob.size === 0) {
        console.error("Audio blob size is 0. Cannot transcribe.");
        throw new Error("Cannot transcribe empty audio recording.");
    }

    const formData = new FormData();

    // Use the explicitly passed mimeType. Fallback to blob's type if mimeType is somehow null/undefined.
    const actualMimeType = mimeType || audioBlob.type || 'audio/webm'; // Use passed, fallback to blob type, then default
    console.log(`Preparing audio for Whisper API. Original Blob type: ${audioBlob.type}, Explicit/Used MIME type: ${actualMimeType}`);

    // Derive file extension from the actualMimeType being used. Handle potential parameters like ';codecs=opus'.
    // Common extensions: wav, webm, ogg, mp4, aac, mp3 (though mp3 recording is rare in browsers)
    let fileExtension = actualMimeType.split('/')[1]?.split(';')[0] || 'bin'; // Default to 'bin' if extraction fails
    // Correct common extensions if needed (e.g., mpeg for mp3)
    if (fileExtension === 'mpeg') fileExtension = 'mp3';
    if (fileExtension === 'ogg') fileExtension = 'ogg'; // Ensure common ones are simple
    if (fileExtension === 'webm') fileExtension = 'webm';
    if (fileExtension === 'wav') fileExtension = 'wav';
    if (fileExtension === 'mp4') fileExtension = 'mp4'; // Or m4a? mp4 is safer.

    const filename = `audio.${fileExtension}`;
    console.log(`Transcribing ${filename} using MIME type ${actualMimeType}`);

    // Create File object using the audioBlob and the derived filename and actualMimeType
    // Using the actualMimeType here is crucial for the API request.
    const audioFile = new File([audioBlob], filename, { type: actualMimeType });
    formData.append('file', audioFile);

    // Use the standard whisper-1 model
    formData.append('model', 'whisper-1');
    // Optional: Add a basic prompt if needed, but often not necessary for general transcription
    // formData.append('prompt', 'Transcribe the following audio.');
    // Explicitly set response format (though 'json' is default)
    formData.append('response_format', 'json');
    // Optional: Specify language if known, otherwise Whisper auto-detects
    // formData.append('language', 'en');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                // 'Content-Type': 'multipart/form-data' is set automatically by fetch with FormData
            },
            body: formData,
        });

        const data = await response.json(); // Expecting JSON response

        if (!response.ok) {
            console.error("Whisper API Error Response:", data);
            // Try to extract a meaningful error message
            const errorMessage = data.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(`Whisper API Error: ${errorMessage}`);
        }

        // The transcribed text is in the 'text' property of the JSON response
        if (typeof data.text !== 'string') {
             console.error("Whisper API Response format unexpected:", data);
             throw new Error("Unexpected response format from transcription API.");
        }

        console.log("Whisper Transcription Successful:", data.text);
        return data.text; // Return the transcribed text

    } catch (error) {
        console.error("Error during transcription request:", error);
        // Ensure the error thrown is an actual Error object with a useful message
        if (error instanceof Error) {
            throw error; // Re-throw original error if it's already an Error instance
        } else {
            throw new Error(`Transcription failed: ${String(error)}`); // Convert other types to string
        }
    }
};