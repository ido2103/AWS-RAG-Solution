# system_prompts.py
# This script defines system prompts in multiple languages for use in an
# AI-driven assistant.
# The prompts are structured to guide interactions between a human user and
# the AI.
# An enumeration `Language` is used to define the supported languages in a
# structured way.

from enum import Enum


# Enumeration to define supported languages
class Language(Enum):
    ENGLISH = "en"  # English language code
    FRENCH_CA = "fr-ca"  # Canadian French language code
    HEBREW = "he"  # Hebrew language code
    # Add other languages here if needed


# Set default language (English)
locale = Language.HEBREW.value  # Default language is set to Hebrew

# Dictionary containing prompts in different languages
prompts = {
    "en": {
        # Prompt for answering questions using provided context
        "qa_prompt": (
            "Use the following pieces of context to answer the question at the end. "
            "If you don't know the answer, just say that you don't know, don't try "
            "to make up an answer."
        ),
        # Prompt for conversational interaction between a human and AI
        "conversation_prompt": (
            "The following is a friendly conversation between a human and an AI. "
            "If the AI does not know the answer to a question, it truthfully says "
            "it does not know."
        ),
        # Prompt for rephrasing a follow-up question to be a standalone question
        "condense_question_prompt": (
            "Given the following conversation and a follow up"
            " question, rephrase the follow up question to be a standalone question."
        ),
        "current_conversation_word": "Current conversation",
        "question_word": "Question",
        "assistant_word": "Assistant",
        "chat_history_word": "Chat History",
        "follow_up_input_word": "Follow Up Input",
        "standalone_question_word": "Standalone question",
        "helpful_answer_word": "Helpful Answer",
    },
    "fr-ca": {
        # Prompt for answering questions using provided context (French-Canadian)
        "qa_prompt": (
            "Vous êtes un assistant IA utilisant la Génération Augmentée par "
            "Récupération (RAG). "
            "Répondez aux questions de l'utilisateur uniquement en vous basant sur "
            "les informations contenues dans les documents fournis. "
            "N'ajoutez aucune information supplémentaire et ne faites aucune "
            "supposition qui ne soit pas directement soutenue par ces documents. "
            "Si vous ne trouvez pas la réponse dans les documents, informez "
            "l'utilisateur que l'information n'est pas disponible. "
            "Si possible, dressez la liste des documents référencés."
        ),
        # Prompt for conversational interaction between a human and AI (French-Canadian)
        "conversation_prompt": (
            "Vous êtes un assistant IA capable de répondre aux questions "
            "en fonction de vos connaissances préalables. "
            "Répondez aux questions de l'utilisateur uniquement avec des informations "
            "que vous connaissez déjà. "
            "N'ajoutez aucune information non vérifiée ou spéculative. "
            "Si vous ne connaissez pas la réponse à une question, informez "
            "l'utilisateur que vous n'avez pas suffisamment d'informations "
            "pour répondre."
        ),
        # Prompt for rephrasing a follow-up question to be a
        # standalone question (French-Canadian)
        "condense_question_prompt": (
            "Avec la conversation ci-dessous et la question de suivi, "
            "reformulez la question de suivi de manière à ce qu'elle soit "
            "une question autonome."
        ),
        "current_conversation_word": "Conversation en cours",
        "question_word": "Question",
        "assistant_word": "Assistant",
        "chat_history_word": "Historique de la discussion",
        "follow_up_input_word": "Question de suivi",
        "standalone_question_word": "Question indépendante",
        "helpful_answer_word": "Réponse utile",
    },
    "he": {
        # Prompt for answering questions using provided context (Hebrew)
        "qa_prompt": (
            "השתמש בקטעי ההקשר הבאים כדי לענות על השאלה בסוף. יש לציין את הסעיף והתת סעיף שממנו לקוחה התשובה."
            "אם אינך יודע את התשובה, פשוט אמור שאינך יודע, אל תנסה "
            "להמציא תשובה. "
        ),
        # Prompt for conversational interaction between a human and AI (Hebrew)
        "conversation_prompt": (
            "להלן שיחה ידידותית בין אדם לבינה מלאכותית. "
            "אם הבינה המלאכותית אינה יודעת את התשובה לשאלה, היא אומרת בכנות "
            "שהיא אינה יודעת."
        ),
        # Prompt for rephrasing a follow-up question to be a standalone question (Hebrew)
        "condense_question_prompt": (
            "בהתבסס על השיחה הבאה ושאלת המשך, "
            "נסח מחדש את שאלת ההמשך כך שתהיה שאלה עצמאית."
        ),
        "current_conversation_word": "שיחה נוכחית",
        "question_word": "שאלה",
        "assistant_word": "עוזר",
        "chat_history_word": "היסטוריית צ'אט",
        "follow_up_input_word": "שאלת המשך",
        "standalone_question_word": "שאלה עצמאית",
        "helpful_answer_word": "תשובה מועילה",
    },
    # Add other languages here if needed
}
