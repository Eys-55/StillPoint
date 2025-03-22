export const questions = [
  {
    question: "How would you describe your current mental state in general?",
    type: "single",
    options: ["Mostly stable", "Frequently overwhelmed", "Up and down", "Mostly low or numb", "I’m not sure"],
    optionDetails: {
      "Mostly stable": "The user generally experiences balanced emotions and copes well with daily stressors.",
      "Frequently overwhelmed": "The user often feels stressed and struggles to manage emotional responses.",
      "Up and down": "The user experiences significant emotional fluctuations throughout the day.",
      "Mostly low or numb": "The user frequently experiences low mood or emotional blunting.",
      "I’m not sure": "The user is uncertain about their emotional state and may need further evaluation."
    }
  },
  {
    question: "Which statement feels closest to you?",
    type: "single",
    options: ["I know myself well", "I’m still figuring things out", "I feel disconnected from myself", "I want to understand myself more"],
    optionDetails: {
      "I know myself well": "The user has a strong self-awareness and clear understanding of their emotions.",
      "I’m still figuring things out": "The user is in the process of self-discovery and learning about their emotional patterns.",
      "I feel disconnected from myself": "The user experiences a sense of detachment from their emotions and identity.",
      "I want to understand myself more": "The user seeks deeper insight into their feelings and personal behavior."
    }
  },
  {
    question: "How do you usually respond to stress?",
    type: "multi",
    options: ["I overthink", "I shut down", "I get emotional", "I distract myself", "I try to solve it immediately"],
    optionDetails: {
      "I overthink": "The user tends to analyze situations excessively, which may increase stress.",
      "I shut down": "The user may withdraw or become unresponsive when stressed.",
      "I get emotional": "The user reacts with strong emotional responses during stressful situations.",
      "I distract myself": "The user uses diversion techniques to avoid confronting stress.",
      "I try to solve it immediately": "The user takes an active, problem-solving approach to managing stress."
    }
  },
  {
    question: "Which of these emotions do you deal with most often?",
    type: "multi",
    options: ["Anxiety", "Sadness", "Anger", "Guilt", "Loneliness", "Emptiness"],
    optionDetails: {
      "Anxiety": "The user frequently experiences worry or nervousness.",
      "Sadness": "The user often feels sorrow or low mood.",
      "Anger": "The user regularly experiences irritability or frustration.",
      "Guilt": "The user is often troubled by feelings of remorse or self-blame.",
      "Loneliness": "The user frequently feels isolated or disconnected from others.",
      "Emptiness": "The user experiences a pervasive sense of void or lack of fulfillment."
    }
  },
  {
    question: "Which of these areas affect your mental health the most?",
    type: "multi",
    options: ["Romantic relationships", "Family", "Friendships", "School/work pressure", "Financial worries", "Body image or self-esteem"],
    optionDetails: {
      "Romantic relationships": "The user finds that intimate relationships impact their mental well-being significantly.",
      "Family": "Family dynamics play a major role in the user's emotional health.",
      "Friendships": "The user is influenced by social interactions and peer relationships.",
      "School/work pressure": "Academic or professional stress is a key factor for the user.",
      "Financial worries": "Monetary concerns contribute to the user's stress levels.",
      "Body image or self-esteem": "Issues with self-perception and body image affect the user's mental state."
    }
  },
  {
    question: "How do you usually process your emotions?",
    type: "multi",
    options: ["I talk to someone", "I keep them to myself", "I write or journal", "I ignore them", "I reflect quietly"],
    optionDetails: {
      "I talk to someone": "The user prefers discussing emotions with others to gain clarity.",
      "I keep them to myself": "The user tends to internalize feelings and avoid sharing with others.",
      "I write or journal": "The user uses writing as a method to process emotions.",
      "I ignore them": "The user may dismiss or avoid confronting their feelings.",
      "I reflect quietly": "The user processes emotions internally through introspection."
    }
  },
  {
    question: "What kind of support helps you the most?",
    type: "multi",
    options: ["Being heard without judgment", "Getting advice", "Reflective questions", "Reminders or motivation", "Reframing my thoughts"],
    optionDetails: {
      "Being heard without judgment": "The user benefits from empathetic listening without criticism.",
      "Getting advice": "The user values receiving actionable suggestions.",
      "Reflective questions": "The user finds insight through probing, reflective inquiries.",
      "Reminders or motivation": "The user is encouraged by supportive prompts and motivational cues.",
      "Reframing my thoughts": "The user appreciates guidance in viewing situations from a different perspective."
    }
  },
  {
    question: "How do you prefer the AI therapist to interact with you?",
    type: "multi",
    options: ["Warm and empathetic", "Direct and honest", "Calm and steady", "Encouraging and uplifting", "Structured and goal-oriented", "Friendly and casual"],
    optionDetails: {
      "Warm and empathetic": "The user prefers a caring and compassionate interaction style.",
      "Direct and honest": "The user values straightforward communication.",
      "Calm and steady": "The user is comforted by a composed and consistent tone.",
      "Encouraging and uplifting": "The user responds well to positive reinforcement.",
      "Structured and goal-oriented": "The user benefits from clear objectives and organized guidance.",
      "Friendly and casual": "The user appreciates a relaxed and approachable manner."
    }
  },
  {
    question: "What kind of responses help you feel most supported?",
    type: "multi",
    options: ["Straightforward advice", "Thoughtful reflections", "Emotional validation", "Clear action steps", "Open-ended questions"],
    optionDetails: {
      "Straightforward advice": "The user values clear and concise recommendations.",
      "Thoughtful reflections": "The user appreciates insightful and considered feedback.",
      "Emotional validation": "The user finds comfort in having their feelings acknowledged.",
      "Clear action steps": "The user benefits from specific, actionable suggestions.",
      "Open-ended questions": "The user prefers prompts that encourage deeper self-exploration."
    }
  },
  {
    question: "What tone do you feel most comfortable with?",
    type: "multi",
    options: ["Gentle and supportive", "Neutral and professional", "Light and friendly", "Motivational and assertive"],
    optionDetails: {
      "Gentle and supportive": "The user prefers a soft and caring tone.",
      "Neutral and professional": "The user values a balanced, formal approach.",
      "Light and friendly": "The user appreciates a casual and upbeat tone.",
      "Motivational and assertive": "The user responds well to energetic and confident communication."
    }
  }
];