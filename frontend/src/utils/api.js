import axios from 'axios'

const BASE = '/api'

export const api = {
  login: (username, password, captchaAnswer = null) =>
    axios.post(`${BASE}/auth/login`, { username, password, captcha_answer: captchaAnswer })
      .then(r => r.data),

  getCaptcha: () =>
    axios.get(`${BASE}/auth/captcha`).then(r => r.data),

  getAttempts: () =>
    axios.get(`${BASE}/dashboard/attempts`).then(r => r.data),

  getStats: () =>
    axios.get(`${BASE}/dashboard/stats`).then(r => r.data),

  getTimeline: () =>
    axios.get(`${BASE}/dashboard/timeline`).then(r => r.data),

  simulateNormal: () =>
    axios.post(`${BASE}/demo/simulate-normal`).then(r => r.data),

  simulateAttack: () =>
    axios.post(`${BASE}/demo/simulate-attack`).then(r => r.data),

  reset: () =>
    axios.post(`${BASE}/demo/reset`).then(r => r.data),
}
