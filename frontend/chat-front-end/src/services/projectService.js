// src/services/projectService.js

import { axiosInstance } from '../lib/axios';

// Mock data for development
const mockProject = {
  id: "1",
  clientName: "Sample Construction Project",
  description: "A modern office building construction project in downtown area.",
  imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80",
  activities: [
    {
      id: "1",
      name: "Site Preparation",
      description: "Clear the site and prepare for construction",
      startDate: "2024-03-01",
      endDate: "2024-03-15",
      completed: true
    },
    {
      id: "2",
      name: "Foundation Work",
      description: "Excavation and foundation laying",
      startDate: "2024-03-16",
      endDate: "2024-04-01",
      completed: false
    },
    {
      id: "3",
      name: "Structural Framework",
      description: "Erect the main structural framework",
      startDate: "2024-04-02",
      endDate: "2024-05-15",
      completed: false
    }
  ],
  documents: [
    {
      _id: "1",
      name: "Project Blueprint",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    },
    {
      _id: "2",
      name: "Site Survey",
      url: "https://via.placeholder.com/300"
    }
  ]
};

// Development mode check
const isDevelopment = window.location.hostname === 'localhost';

export const getProjectDetails = async (id) => {
  try {
    if (isDevelopment) {
      console.log('Using mock data for development');
      return mockProject;
    }
    const response = await axiosInstance.get(`/projects/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw error;
  }
};

export const uploadDocument = async (id, formData) => {
  try {
    if (isDevelopment) {
      console.log('Mock document upload:', formData.get('file'));
      return { success: true, id: Math.random().toString(36).substr(2, 9) };
    }
    const response = await axiosInstance.post(`/projects/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const deleteDocument = async (projectId, docId) => {
  try {
    if (isDevelopment) {
      console.log('Mock document deletion:', docId);
      return { success: true };
    }
    const response = await axiosInstance.delete(`/projects/${projectId}/documents/${docId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const addProjectActivity = async (projectId, activity) => {
  try {
    if (isDevelopment) {
      const newActivity = {
        id: Math.random().toString(36).substr(2, 9),
        ...activity
      };
      mockProject.activities.push(newActivity);
      return newActivity;
    }
    const response = await axiosInstance.post(`/projects/${projectId}/activities`, activity);
    return response.data;
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
};

export const updateProjectActivity = async (projectId, activityId, updates) => {
  try {
    if (isDevelopment) {
      const activityIndex = mockProject.activities.findIndex(a => a.id === activityId);
      if (activityIndex !== -1) {
        mockProject.activities[activityIndex] = {
          ...mockProject.activities[activityIndex],
          ...updates
        };
      }
      return mockProject.activities[activityIndex];
    }
    const response = await axiosInstance.patch(`/projects/${projectId}/activities/${activityId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

export const deleteProjectActivity = async (projectId, activityId) => {
  try {
    if (isDevelopment) {
      mockProject.activities = mockProject.activities.filter(a => a.id !== activityId);
      return { success: true };
    }
    const response = await axiosInstance.delete(`/projects/${projectId}/activities/${activityId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};
  