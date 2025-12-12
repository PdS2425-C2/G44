import { Container } from "react-bootstrap";

function Home({ user }) {
  return (
    <Container className="mt-5 text-center">
      <h2>Benvenuto {user?.name}</h2>
    </Container>
  );
}

export default Home;
