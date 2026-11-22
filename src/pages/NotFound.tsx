import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFound() {
  return (
    <div className="shell page-pad">
      <div className="not-found">
        <span className="not-found-code mono">404</span>
        <h1>This stretch is not on the watch list</h1>
        <p>The page you were looking for does not exist, or the report has been removed.</p>
        <div className="success-actions">
          <Link to="/" className="btn btn-primary">
            Back to the risk board <Icon name="arrow" size={16} />
          </Link>
          <Link to="/queue" className="btn btn-ghost">
            Open the verify queue
          </Link>
        </div>
      </div>
    </div>
  );
}
