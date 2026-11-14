import { backendUrl } from '../App';
import api from './authenticatedApi';

const customFetch = async (pathname, options = {}) => {
  const { body, ...config } = options;
  const response = await api.request({
    ...config,
    url: `${backendUrl}/api${pathname}`,
    data: body,
  });
  return response.data;
};
export default customFetch;
