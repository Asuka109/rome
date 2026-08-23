// Re-exported so existing importers keep their path. The id itself lives in the
// shared package because the dashboard filters this row out of its people lists
// and the mock backend seeds it, so all three read one value.
export { STRANGER_PERSON_ID, STRANGER_PERSON_DISPLAY_NAME } from "@rome/api-types/persons";
