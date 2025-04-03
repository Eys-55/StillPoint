import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudioWithWhisper } from '../services/whisperService.js';

export const useVoiceRecorder = (setInput) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [transcribing, setTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const streamRef = useRef(null); // Keep track of the stream
    const selectedMimeTypeRef = useRef(''); // Store the selected mimeType

    const stopRecording = useCallback(() => {
        console.log("Attempting to stop recording...");
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            console.log("Calling mediaRecorder.stop()");
            mediaRecorderRef.current.stop(); // This triggers the 'onstop' event handler
        } else {
             console.log("MediaRecorder not recording or not initialized.");
        }

        // Cleanup stream tracks immediately
        if (streamRef.current) {
            console.log("Stopping media stream tracks.");
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Clear timer and reset state
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
        // Reset transcribing state in case it was stuck
        // setTranscribing(false); // Let onstop handle this transition
    }, []); // No dependencies needed for cleanup logic

    const handleVoiceButton = useCallback(async () => {
        if (isRecording) {
            stopRecording();
        } else {
            // Start recording
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Media Devices API not supported in this browser.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream; // Store the stream

                // Determine supported MIME type more robustly, prioritizing WAV
                const supportedTypes = [
                    'audio/wav', // Prioritize WAV
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/ogg;codecs=opus',
                    'audio/ogg',
                    'audio/mp4', // Less common for recording, but check
                    'audio/aac'  // Less common for recording
                ];
                let foundMimeType = '';
                for (const type of supportedTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        console.log(`Supported MIME type found: ${type}`);
                        foundMimeType = type;
                        break;
                    }
                }

                if (!foundMimeType) {
                     console.warn("No preferred MIME type supported, using browser default.");
                     selectedMimeTypeRef.current = ''; // Let browser decide
                     // alert("Your browser may not support reliable audio recording formats for transcription. Transcription might fail.");
                     // Consider stopping if no reliable format is found, or proceed with caution
                } else {
                    selectedMimeTypeRef.current = foundMimeType;
                }

                const options = selectedMimeTypeRef.current ? { mimeType: selectedMimeTypeRef.current } : {};
                console.log("Using MediaRecorder options:", options);

                mediaRecorderRef.current = new MediaRecorder(stream, options);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        console.log(`Audio data available, chunk size: ${event.data.size}`);
                        audioChunksRef.current.push(event.data);
                    } else {
                        console.log("Audio data available event fired, but chunk size is 0.");
                    }
                };

                mediaRecorderRef.current.onstop = async () => {
                    console.log("Recording stopped (onstop event triggered).");
                    // State updates moved here from stopRecording to ensure they happen *after* stop completes
                    setIsRecording(false);
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                    setRecordingTime(0);
                    // Stream tracks should be stopped in stopRecording or here if not already done
                    streamRef.current?.getTracks().forEach(track => track.stop());
                    streamRef.current = null;

                    if (audioChunksRef.current.length === 0) {
                        console.warn("No audio data chunks were collected.");
                        setTranscribing(false); // Ensure transcribing state is reset
                        setInput(""); // Clear any placeholder text
                        return;
                    }

                    setTranscribing(true);
                    setInput("Transcribing audio..."); // Placeholder

                    // Determine the actual MIME type used for the Blob
                    // Use the type selected during setup, or fallback if none was explicitly set/supported
                    const actualMimeType = mediaRecorderRef.current?.mimeType || selectedMimeTypeRef.current || 'audio/webm'; // Provide a sensible fallback
                    console.log(`Creating Blob with type: ${actualMimeType}`);
                    const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
                    audioChunksRef.current = []; // Clear chunks after creating blob

                    // Log blob size
                    const blobSizeMB = (audioBlob.size / 1024 / 1024).toFixed(2);
                    console.log(`Audio Blob created. Size: ${blobSizeMB} MB, Type: ${audioBlob.type}`);

                    if (audioBlob.size === 0) {
                        console.error("Created audio blob has size 0. Cannot transcribe.");
                        alert("Failed to record audio (empty recording). Please try again.");
                        setTranscribing(false);
                        setInput("");
                        return;
                    }

                    if (audioBlob.size > 25 * 1024 * 1024) {
                        console.warn(`Audio file (${blobSizeMB} MB) exceeds 25MB limit, transcription may fail or be truncated.`);
                        // Optionally alert user or prevent API call
                        // alert("Recording is too long (over 25MB) and may not be fully transcribed.");
                    }

                    // --- Optional: Trigger Download for Debugging ---
                    let audioUrl = null;
                    try {
                        audioUrl = URL.createObjectURL(audioBlob);
                        const link = document.createElement('a');
                        link.href = audioUrl;
                        // Derive extension from the *actual* mimeType used for the blob
                        const fileExtension = actualMimeType.split('/')[1]?.split(';')[0] || 'bin';
                        link.download = `recorded_audio_${Date.now()}.${fileExtension}`;
                        // document.body.appendChild(link);
                        // link.click(); // Temporarily disable automatic download
                        // document.body.removeChild(link);
                        console.log(`DEBUG: Audio ready for download as ${link.download} (URL: ${audioUrl})`);
                    } catch (downloadError) {
                        console.error("Error creating audio download link:", downloadError);
                    }
                    // --- End Optional Download ---

                    try {
                        console.log(`Calling whisperService with blob type: ${audioBlob.type} and explicit mimeType: ${actualMimeType}`);
                        // Pass the explicitly determined MIME type to the service
                        const transcript = await transcribeAudioWithWhisper(audioBlob, actualMimeType);
                        console.log("Transcription successful:", transcript);
                        // Replace placeholder or append, depending on context
                        setInput(prevInput => (prevInput === "Transcribing audio..." ? transcript : prevInput + ' ' + transcript).trim());
                    } catch (error) {
                        console.error("Transcription failed:", error);
                        // Clear placeholder if transcription fails
                        setInput(prevInput => (prevInput === "Transcribing audio..." ? "" : prevInput));
                        alert(`Transcription failed: ${error.message}`);
                    } finally {
                        setTranscribing(false);
                        if (audioUrl) {
                            URL.revokeObjectURL(audioUrl);
                            console.log("Revoked audio blob URL");
                        }
                        // Clean up MediaRecorder instance
                        mediaRecorderRef.current = null;
                        selectedMimeTypeRef.current = '';
                    }
                };

                mediaRecorderRef.current.onerror = (event) => {
                    console.error("MediaRecorder error:", event.error);
                    alert(`Recording error: ${event.error?.name || 'Unknown error'} - ${event.error?.message || 'No details'}`);
                    // Ensure cleanup happens on error as well
                    stopRecording(); // Call cleanup
                    setTranscribing(false); // Ensure transcribing state is reset
                    setInput(""); // Clear any placeholder
                };

                mediaRecorderRef.current.start(1000); // Optional: timeslice to trigger ondataavailable periodically (e.g., every second) - might help with very long recordings but adds overhead. Remove 1000 for default chunking.
                console.log("Recording started.");
                setIsRecording(true);
                setRecordingTime(0);
                timerIntervalRef.current = setInterval(() => {
                    setRecordingTime(prev => prev + 1);
                }, 1000);

            } catch (err) {
                console.error("Error accessing microphone or starting recorder:", err);
                alert(`Could not access microphone: ${err.message}`);
                setIsRecording(false); // Ensure state is correct
                // Cleanup any partial stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            }
        }
    }, [isRecording, setInput, stopRecording]); // Include stopRecording in dependencies

    // Cleanup effect when component unmounts
    useEffect(() => {
        return () => {
            console.log("Cleanup effect: Stopping recording and clearing resources.");
            stopRecording();
            // Ensure MediaRecorder is nullified if component unmounts mid-recording
             if (mediaRecorderRef.current) {
                 mediaRecorderRef.current.onstop = null; // Prevent async onstop call after unmount
                 mediaRecorderRef.current.ondataavailable = null;
                 mediaRecorderRef.current.onerror = null;
                 mediaRecorderRef.current = null;
             }
        };
    }, [stopRecording]); // Depend on stopRecording

    return {
        isRecording,
        recordingTime,
        transcribing,
        handleVoiceButton,
        stopRecording // Expose stopRecording if needed externally
    };
};