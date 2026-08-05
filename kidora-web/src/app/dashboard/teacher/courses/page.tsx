'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/axios';

interface TeacherCourse {
  id: string;
  title: string;
  status: string;
  published: boolean;
  createdAt: string;
}

export default function TeacherCoursesPage() {
  useRequireAuth(['TEACHER']);
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses/mine')
      .then((res) => setCourses(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <Link href="/dashboard/teacher/create-course/basic-info" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
          + New course
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="text-gray-500">No courses yet. Create your first one!</p>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <div key={c.id} className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500">{c.published ? 'Published' : 'Draft'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}