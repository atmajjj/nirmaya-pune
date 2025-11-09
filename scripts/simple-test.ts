import axios from 'axios';
import { logger } from '../src/utils/logger';

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function simpleTest() {
  try {
    logger.info('Testing basic connectivity...');
    await axios.get(`http://localhost:8000/api-docs`);
    logger.info('Server is reachable');

    // Test login
    logger.info('Testing login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'myselfharshal2004@gmail.com',
      password: 'harshal2004',
    });

    logger.info('Login successful');
    logger.info(`Response: ${JSON.stringify(loginResponse.data)}`);
  } catch (error: unknown) {
    const err = error as Error & {
      response?: { status: number; data: unknown };
    };
    logger.error(`Error: ${err.message}`);
    if (err.response) {
      logger.error(`Status: ${err.response.status}`);
      logger.error(`Data: ${JSON.stringify(err.response.data)}`);
    }
  }
}

simpleTest();
