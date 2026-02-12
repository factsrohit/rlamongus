import styles from "./loginpage.module.css";

export default function LoginPage() {
    return(
        <div className={styles.loginPageBody}>
            <div className={styles.wrapper}>
                <div className={styles.container}>
                    <h1 className={styles.heading}>Login</h1>
                    <form action="/login" method="POST">
                        <input type="text" name="username" placeholder="Username" required />
                        <input type="password" name="password" placeholder="Password" required />
                        <button type="submit">Login</button>
                    </form>
                </div>

                <div className={styles.container}>
                    <h1 className={styles.heading}>Register</h1>
                    <form action="/register" method="POST">
                        <input type="text" name="username" placeholder="Username" required />
                        <input type="password" name="password" placeholder="Password" required />
                        <button type="submit">Register</button>
                    </form>
                </div>
            </div>
        </div>
    );
}