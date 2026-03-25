import styles from "../styles/Pages/ContactPage.module.css";

export default function ContactPage() {
    return (
        <main className={styles.contactPage}>
            <section className={styles.container}>
                <h1 className={styles.title}>Contact Us</h1>

                <section className={styles.section}>
                    <h2>StudySpot (General Enquiries)</h2>
                    <p>
                        <strong>Email:</strong>{" "}
                        <a href="mailto:StudySpotTeam@Cardiff.ac.uk">
                            StudySpotTeam@Cardiff.ac.uk
                        </a>
                    </p>
                    <p>
                        <strong>Telephone:</strong>{" "}
                        <a href="tel:02920782302">029 2078 2302</a>
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Feedback</h2>
                    <p>
                        You can leave feedback via our email or phone number.
                        This will help ensure your feedback reaches the relevant
                        department.
                    </p>
                    <p>
                        Alternatively, you can contact Customer Service by
                        emailing{" "}
                        <a href="mailto:sucustomerservice@cardiff.ac.uk">
                            sucustomerservice@cardiff.ac.uk
                        </a>
                        .
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Press enquiries</h2>
                    <p>
                        Our dedicated press team will be happy to help with any
                        media enquiries.
                    </p>
                    <p>
                        The mailbox will be monitored Monday to Friday from
                        09:00 to 17:00. There will be limited out-of-hours
                        access.
                    </p>
                    <p>
                        Please clearly state your publication and any deadlines
                        you are working to, and we will aim to get back to you
                        as soon as possible.
                    </p>
                </section>
            </section>
        </main>
    );
}