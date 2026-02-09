import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ReviewPage from "./pages/ReviewPage";
import SearchPage from "./pages/SearchPage";
import AllTokensPage from "./pages/AllTokensPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tokens" element={<AllTokensPage />} />
      <Route path="/review/:id" element={<ReviewPage />} />
      <Route path="/search" element={<SearchPage />} />
    </Routes>
  );
};

export default App;
