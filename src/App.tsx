import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { FormLayout } from './components/form-layout';
import { SimpleForm } from './pages/simple-form';

const PREDEFINED_COLORS = {
  red: '#FF0000',
  orange: '#FFA500',
  yellow: '#FFD700',
  green: '#008000',
  gold: '#FFD700',
  blue: '#0000FF',
  purple: '#800080',
  black: '#000000'
} as const;

function App() {
  return (
    <>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<FormLayout />}>
            <Route index element={<SimpleForm settings={{
              country: 'AU',
              buttonColor: PREDEFINED_COLORS.black,
              leadSource: 'LoansOne Legacy',
              brand: 'N/A',
              buttonText: 'Submit',
            }} />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;