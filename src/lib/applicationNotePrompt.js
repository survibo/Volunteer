export const defaultApplicationNotePrompt = {
  label: '종목 선택(1, 2, 3순위)',
  description: '',
  placeholder: '1순위: OO, 2순위: OO, 3순위: OO',
}

export function getApplicationNotePrompt(activity) {
  return {
    label: activity?.application_note_label?.trim() || defaultApplicationNotePrompt.label,
    description: activity?.application_note_description?.trim()
      ? activity.application_note_description
      : defaultApplicationNotePrompt.description,
    placeholder: activity?.application_note_placeholder?.trim()
      ? activity.application_note_placeholder
      : defaultApplicationNotePrompt.placeholder,
  }
}
