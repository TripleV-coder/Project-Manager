'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/lib/fetch-with-timeout';
import { toast } from 'sonner';

/**
 * Hook pour charger et gérer les données nécessaires aux formulaires de création/édition
 * d'items (Epic, Story, Tâche, Bug)
 *
 * @param {Object} options - Options de configuration
 * @param {string} options.projectId - ID du projet sélectionné (optionnel)
 * @param {boolean} options.loadProjects - Charger la liste des projets
 * @param {boolean} options.loadUsers - Charger la liste des utilisateurs
 * @param {boolean} options.loadSprints - Charger la liste des sprints
 * @param {boolean} options.loadDeliverables - Charger la liste des livrables
 * @param {Function} options.onUnauthorized - Callback en cas d'erreur 401
 */
export function useItemFormData({
  projectId = null,
  loadProjects = true,
  loadUsers = true,
  loadSprints = true,
  loadDeliverables = false,
  onUnauthorized = () => {}
} = {}) {
  // États des données
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [epics, setEpics] = useState([]);
  const [stories, setStories] = useState([]);

  // États de chargement
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // États d'erreur
  const [errors, setErrors] = useState({
    projects: null,
    users: null,
    sprints: null,
    deliverables: null,
    items: null
  });

  // Vérification si les données sont prêtes
  const [dataReady, setDataReady] = useState(false);

  /**
   * Extrait les données d'une réponse API de manière sécurisée
   * Supporte les formats: { data: [...] }, { items: [...] }, [...] direct
   */
  const extractData = useCallback((response, keys = ['data']) => {
    if (!response) return [];

    // Si c'est directement un tableau
    if (Array.isArray(response)) return response;

    // Chercher dans les clés possibles
    for (const key of keys) {
      if (response[key] && Array.isArray(response[key])) {
        return response[key];
      }
    }

    return [];
  }, []);

  /**
   * Charger les projets
   */
  const fetchProjects = useCallback(async (token) => {
    if (!loadProjects) return;

    setLoadingProjects(true);
    setErrors(prev => ({ ...prev, projects: null }));

    try {
      const response = await safeFetch('/api/projects?limit=100&page=1', token);
      const projectsList = extractData(response, ['data', 'projects']);

      if (!Array.isArray(projectsList)) {
        throw new Error('Format de réponse invalide pour les projets');
      }

      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Erreur chargement projets:', error);
      setErrors(prev => ({ ...prev, projects: error.message }));

      if (error.message === 'UNAUTHORIZED') {
        onUnauthorized();
      } else if (error.message !== 'TIMEOUT') {
        toast.error('Erreur lors du chargement des projets');
      }
      return [];
    } finally {
      setLoadingProjects(false);
    }
  }, [loadProjects, extractData, onUnauthorized]);

  /**
   * Charger les utilisateurs
   */
  const fetchUsers = useCallback(async (token) => {
    if (!loadUsers) return;

    setLoadingUsers(true);
    setErrors(prev => ({ ...prev, users: null }));

    try {
      const response = await safeFetch('/api/users?limit=100&page=1', token);
      const usersList = extractData(response, ['data', 'users']);

      if (!Array.isArray(usersList)) {
        throw new Error('Format de réponse invalide pour les utilisateurs');
      }

      setUsers(usersList);
      return usersList;
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setErrors(prev => ({ ...prev, users: error.message }));

      if (error.message === 'UNAUTHORIZED') {
        onUnauthorized();
      }
      return [];
    } finally {
      setLoadingUsers(false);
    }
  }, [loadUsers, extractData, onUnauthorized]);

  /**
   * Charger les sprints (optionnellement filtrés par projet)
   */
  const fetchSprints = useCallback(async (token, filterProjectId = null) => {
    if (!loadSprints) return;

    setLoadingSprints(true);
    setErrors(prev => ({ ...prev, sprints: null }));

    try {
      const url = filterProjectId
        ? `/api/sprints?projet_id=${filterProjectId}`
        : '/api/sprints?limit=100';

      const response = await safeFetch(url, token);
      const sprintsList = extractData(response, ['data', 'sprints']);

      if (!Array.isArray(sprintsList)) {
        throw new Error('Format de réponse invalide pour les sprints');
      }

      setSprints(sprintsList);
      return sprintsList;
    } catch (error) {
      console.error('Erreur chargement sprints:', error);
      setErrors(prev => ({ ...prev, sprints: error.message }));

      if (error.message === 'UNAUTHORIZED') {
        onUnauthorized();
      }
      return [];
    } finally {
      setLoadingSprints(false);
    }
  }, [loadSprints, extractData, onUnauthorized]);

  /**
   * Charger les livrables (optionnellement filtrés par projet)
   */
  const fetchDeliverables = useCallback(async (token, filterProjectId = null) => {
    if (!loadDeliverables) return;

    setLoadingDeliverables(true);
    setErrors(prev => ({ ...prev, deliverables: null }));

    try {
      const url = filterProjectId
        ? `/api/deliverables?projet_id=${filterProjectId}&limit=100`
        : '/api/deliverables?limit=100&page=1';

      const response = await safeFetch(url, token);
      const deliverablesList = extractData(response, ['data', 'deliverables']);

      if (!Array.isArray(deliverablesList)) {
        throw new Error('Format de réponse invalide pour les livrables');
      }

      setDeliverables(deliverablesList);
      return deliverablesList;
    } catch (error) {
      console.error('Erreur chargement livrables:', error);
      setErrors(prev => ({ ...prev, deliverables: error.message }));

      if (error.message === 'UNAUTHORIZED') {
        onUnauthorized();
      }
      return [];
    } finally {
      setLoadingDeliverables(false);
    }
  }, [loadDeliverables, extractData, onUnauthorized]);

  /**
   * Charger les epics et stories pour un projet donné
   */
  const fetchEpicsAndStories = useCallback(async (token, filterProjectId) => {
    if (!filterProjectId || filterProjectId === 'all') {
      setEpics([]);
      setStories([]);
      return { epics: [], stories: [] };
    }

    setLoadingItems(true);
    setErrors(prev => ({ ...prev, items: null }));

    try {
      const response = await safeFetch(
        `/api/tasks?projet_id=${filterProjectId}&limit=200&page=1`,
        token
      );
      const tasksList = extractData(response, ['data', 'tasks']);

      if (!Array.isArray(tasksList)) {
        throw new Error('Format de réponse invalide pour les tâches');
      }

      const epicsList = tasksList.filter(t => t.type === 'Épic');
      const storiesList = tasksList.filter(t => t.type === 'Story');

      setEpics(epicsList);
      setStories(storiesList);

      return { epics: epicsList, stories: storiesList };
    } catch (error) {
      console.error('Erreur chargement epics/stories:', error);
      setErrors(prev => ({ ...prev, items: error.message }));

      if (error.message === 'UNAUTHORIZED') {
        onUnauthorized();
      }
      return { epics: [], stories: [] };
    } finally {
      setLoadingItems(false);
    }
  }, [extractData, onUnauthorized]);

  /**
   * Charger toutes les données initiales
   */
  const loadAllData = useCallback(async () => {
    const token = localStorage.getItem('pm_token');
    if (!token) {
      onUnauthorized();
      return;
    }

    setLoading(true);
    setDataReady(false);

    try {
      const promises = [];

      if (loadProjects) promises.push(fetchProjects(token));
      if (loadUsers) promises.push(fetchUsers(token));
      if (loadSprints) promises.push(fetchSprints(token, projectId));
      if (loadDeliverables) promises.push(fetchDeliverables(token, projectId));

      await Promise.all(promises);

      // Charger les epics/stories si un projet est sélectionné
      if (projectId && projectId !== 'all') {
        await fetchEpicsAndStories(token, projectId);
      }

      setDataReady(true);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [
    projectId,
    loadProjects,
    loadUsers,
    loadSprints,
    loadDeliverables,
    fetchProjects,
    fetchUsers,
    fetchSprints,
    fetchDeliverables,
    fetchEpicsAndStories,
    onUnauthorized
  ]);

  /**
   * Recharger les données liées à un projet spécifique
   */
  const reloadProjectData = useCallback(async (newProjectId) => {
    const token = localStorage.getItem('pm_token');
    if (!token) {
      onUnauthorized();
      return;
    }

    const promises = [];

    if (loadSprints) promises.push(fetchSprints(token, newProjectId));
    if (loadDeliverables) promises.push(fetchDeliverables(token, newProjectId));
    promises.push(fetchEpicsAndStories(token, newProjectId));

    await Promise.all(promises);
  }, [loadSprints, loadDeliverables, fetchSprints, fetchDeliverables, fetchEpicsAndStories, onUnauthorized]);

  /**
   * Rafraîchir toutes les données
   */
  const refresh = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // Charger les données au montage
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Recharger quand le projet change
  useEffect(() => {
    if (dataReady && projectId) {
      reloadProjectData(projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return {
    // Données
    projects,
    users,
    sprints,
    deliverables,
    epics,
    stories,

    // États de chargement
    loading,
    loadingProjects,
    loadingUsers,
    loadingSprints,
    loadingDeliverables,
    loadingItems,

    // États d'erreur
    errors,
    hasErrors: Object.values(errors).some(e => e !== null),

    // État de préparation
    dataReady,

    // Actions
    refresh,
    reloadProjectData,
    fetchEpicsAndStories
  };
}

export default useItemFormData;
