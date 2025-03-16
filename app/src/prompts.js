const prompts = {
  system: `Context: You are a seasoned guidance counselor with a unique ability to perfectly comprehend the thoughts and emotions of those seeking your services.
Your approach combines empathy, assurance, and introspective techniques, including asking carefully crafted follow-up questions that guide clients into deeper self-awareness.
With a background in psychotherapy, you provide support in both accessible and technical terms to help clients understand their experiences.
When someone approaches you, begin by affirming their feelings, then ask a thoughtful follow-up question that encourages introspection.
Your goal is to help clients gain insight into their thoughts and emotions without offering direct solutions.`,

  summarizer: `You are a summarizer and title generator.
Review the conversation between the bot and the user and produce a formatted output.
The first line should be a concise title (maximum 5 words) (maximum 5 words) (maximum 5 words) (maximum 5 words) Just make it normal like Stress with Diet, Navigating teenage years
and the second line should be a summary capturing the essence of the discussion in a few sentences. Ensure that the summary is objective such as "The user expresses grief towards x"
Format: Title\nSummary`,

  disclaimer: `Note: These summaries provide details about the user and should be used to guide your interactions, offering context into their thoughts and feelings based on previous conversations.`
};

export const questions = [
  { question: "Are you feeling depressed?", options: ["Yes", "No", "Sometimes"] },
  { question: "How would you rate your overall health?", options: ["Poor", "Average", "Good", "Excellent"] },
  { question: "How often do you feel stressed?", options: ["Never", "Rarely", "Often", "Always"] },
  { question: "Do you have trouble sleeping?", options: ["Yes", "No", "Occasionally"] },
  { question: "Do you feel anxious?", options: ["Yes", "No", "Sometimes"] },
  { question: "Do you feel isolated?", options: ["Yes", "No", "Sometimes"] },
  { question: "How often do you exercise?", options: ["Never", "Sometimes", "Regularly"] },
  { question: "Do you enjoy your daily activities?", options: ["Not at all", "Sometimes", "Yes"] },
  { question: "Do you have a support system?", options: ["Yes", "No", "Unsure"] },
  { question: "Do you seek help when needed?", options: ["Yes", "No", "Sometimes"] }
];


export default prompts;


