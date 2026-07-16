import api from './api';

export const userService = {
  getUsers: () => api.get('/users'),

  getUserById: id => api.get(`/users/${id}`),

  getUserPosts: userId => api.get(`/users/${userId}/posts`),
};
