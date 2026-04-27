import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class TestDB {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://ep-rough-silence-a1ktbcc5-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
        String user = "neondb_owner";
        String password = "npg_eus6JrbvTS8a";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT d.id, u.username, d.verification_status, d.license_number FROM doctors d JOIN users u ON d.user_id = u.id")) {
            
            while (rs.next()) {
                System.out.println("Doctor: " + rs.getString("username"));
                System.out.println("Status: " + rs.getString("verification_status"));
                System.out.println("License: " + rs.getString("license_number"));
                System.out.println("-----------------");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
