import React from 'react'
import { Link } from "react-router-dom";
 
const Navbar = () => {
    return (
        <div>
            <Link to="/home" >
                home
            </Link>
            <Link to="/create" >
                &nbsp;&nbsp;&nbsp;Create
            </Link>
            <Link to="/vault" >
                &nbsp;&nbsp;&nbsp;vault
            </Link>
            <Link to="/trash" >
                &nbsp;&nbsp;&nbsp;trash
            </Link>
            <Link to="/restore" >
                &nbsp;&nbsp;&nbsp;restore
            </Link>
            <Link to="/collections" >
                &nbsp;&nbsp;&nbsp;collections
            </Link>
            <Link to="/starred" >
                &nbsp;&nbsp;&nbsp;starred
            </Link>
            <Link to="/insights" >
                &nbsp;&nbsp;&nbsp;insights
            </Link>
            <Link to="/lab" >
                &nbsp;&nbsp;&nbsp;lab
            </Link>
            <Link to="/account" >
                &nbsp;&nbsp;&nbsp;account
            </Link>

        </div>


    )
}

export default Navbar
