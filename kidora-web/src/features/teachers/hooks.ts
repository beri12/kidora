"use client";
import { useQuery } from "@tanstack/react-query";
import { teachersApi } from "@/lib/api/teachers";

export const teacherKeys = {
  students: ["teachers", "students"] as const,
  courses: ["teachers", "courses"] as const,
};

/**
 * Students visible to the signed-in teacher. The backend restricts this to
 * their own classes, so no filtering is needed (or trusted) on the client.
 */
export function useStudents() {
  return useQuery({ queryKey: teacherKeys.students, queryFn: teachersApi.students, staleTime: 60_000 });
}

export function useTeacherOwnCourses() {
  return useQuery({ queryKey: teacherKeys.courses, queryFn: teachersApi.myCourses, staleTime: 60_000 });
}
