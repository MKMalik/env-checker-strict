import 'dotenv/config';
import { checkEnvAndThrowError } from './env_checker';
checkEnvAndThrowError();

const app = 'name';
console.log(app);
