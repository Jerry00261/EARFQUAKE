import { render, screen } from '@testing-library/react';
import App from './App';

test('renders earthquake dashboard heading', () => {
  render(<App />);
  expect(
    screen.getByText(/earthquake visualization dashboard/i)
  ).toBeInTheDocument();
});
