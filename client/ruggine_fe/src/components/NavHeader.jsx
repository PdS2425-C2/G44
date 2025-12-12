import { Navbar, Nav, Button, Container } from 'react-bootstrap';

export default function NavHeader({ loggedIn, user, handleLogout }) {
	return (
		<Navbar bg="dark" variant="dark" expand="md" className="mb-4">
			<Container fluid>
				{loggedIn && (
				    <>
					    <Navbar.Toggle />
					    <Navbar.Collapse>
						    <Button variant="outline-light" onClick={handleLogout}> Logout </Button>
              </Navbar.Collapse>
            </>
          )}
     	 	</Container>
    	</Navbar>
  );
}