/**
 * The app's API layer. Import domain calls from here rather than reaching for
 * a client directly, so every request has one place to be found and changed.
 */
export { api, ApiError, API_BASE_URL, API_ORIGIN } from "./client";
export { authApi, type RegisterPayload, type OtpRequestResult } from "./auth";
export { studentApi } from "./student";
export { teacherApi, type AnalyticsFilters, type TeacherStudentRow, type TeacherAnalytics } from "./teacher";
export { schoolApi, type ListQuery } from "./school";
export { parentApi } from "./parent";
