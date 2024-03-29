import React, { useEffect, useCallback, useState } from "react";
import { Container, Nav } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./App.css";
import Wallet from "./components/Wallet";
import coverImg from "./assets/img/sandwich.jpg";
import { login, logout as destroy } from "./utils/auth";
import { balance as principalBalance } from "./utils/ledger"
import Cover from "./components/utils/Cover";
import { Notification } from "./components/utils/Notifications";
import Header from "./components/marketplace/Header";
import CourseList from "./components/marketplace/CourseList";
// import AddCourseForm from "./components/AddCourseForm";
import AddCourseForm from "./components/marketplace/AddCourseForm";
import MyCourseList from "./components/marketplace/MyCourseList";
import MyEnrollments from "./components/marketplace/MyEnrollments";


const App = function AppWrapper() {
    const isAuthenticated = window.auth.isAuthenticated;
    const principal = window.auth.principalText;

    const [balance, setBalance] = useState("0");

    const getBalance = useCallback(async () => {
        if (isAuthenticated) {
            setBalance(await principalBalance());
        }
    });

    useEffect(() => {
        getBalance();
    }, [getBalance]);

    return (
        <>
            <Notification />
            {isAuthenticated ? (
                <Container fluid="md">
                    <Nav className="justify-content-end pt-3 pb-5">
                        <Nav.Item>
                            <Wallet
                                principal={principal}
                                balance={balance}
                                symbol={"ICP"}
                                isAuthenticated={isAuthenticated}
                                destroy={destroy}
                            />
                        </Nav.Item>
                    </Nav>
                    <main>
                        <Header />
                        <AddCourseForm />
                        <CourseList />
                        <MyCourseList />
                        <MyEnrollments />
                    </main>
                </Container>
            ) : (
                <Cover name="Street Foods" login={login} coverImg={coverImg} />
            )}
        </>
    );
};

export default App;