import type { InquiryFormConfig } from "@workspace/api-zod";

export const DEFAULT_INQUIRY_FORM_CONFIG: InquiryFormConfig = {
  categories: [
    { id: "tattoo", enabled: true, label: "Tattoo", headline: "Tell me about your tattoo idea.", questions: [
      { id: "idea", label: "What are you imagining?", placeholder: "Describe the design or idea", suggestions: ["Fine line", "Traditional", "Black and grey"] },
      { id: "placement", label: "Where would it go?", placeholder: "Body placement", suggestions: [] },
      { id: "estimatedSize", label: "How large should it be?", placeholder: "Approximate size", suggestions: ["Small", "Medium", "Large"] },
    ] },
    { id: "painting", enabled: true, label: "Painting", headline: "Tell me about the painting you have in mind.", questions: [
      { id: "idea", label: "What are you imagining?", placeholder: "Describe the subject and style", suggestions: [] },
      { id: "placement", label: "Where will it live?", placeholder: "Room, wall, or setting", suggestions: [] },
      { id: "estimatedSize", label: "What size are you considering?", placeholder: "Approximate dimensions", suggestions: ["Small", "Medium", "Large"] },
    ] },
    { id: "other", enabled: true, label: "Something else", headline: "Tell me what you would like to create.", questions: [
      { id: "idea", label: "What are you imagining?", placeholder: "Describe the project", suggestions: [] },
      { id: "placement", label: "Where will it be used?", placeholder: "Location or context", suggestions: [] },
      { id: "estimatedSize", label: "What scale are you considering?", placeholder: "Approximate size", suggestions: [] },
    ] },
  ],
};
