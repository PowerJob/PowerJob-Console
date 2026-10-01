import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConsoleProvider } from './lib/console';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import 'antd/dist/reset.css';
import '@fontsource-variable/inter';
import './styles.css';
createRoot(document.getElementById('root')!).render(<HashRouter><ConsoleProvider><ErrorBoundary><AppRoutes/></ErrorBoundary></ConsoleProvider></HashRouter>);
