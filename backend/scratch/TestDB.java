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
             ResultSet rs = stmt.executeQuery("SELECT username, password FROM users WHERE username IN ('admin', 'dr.sharma')")) {
            
            while (rs.next()) {
                System.out.println("User: " + rs.getString("username"));
                System.out.println("Hash: " + rs.getString("password"));
                System.out.println("-----------------");
            }
            
            // Also check flyway history
            ResultSet rs2 = stmt.executeQuery("SELECT version, description, checksum, success FROM flyway_schema_history ORDER BY version DESC LIMIT 5");
            System.out.println("=== FLYWAY HISTORY ===");
            while (rs2.next()) {
                System.out.println("V" + rs2.getString("version") + " - " + rs2.getString("description") + " | " + rs2.getBoolean("success"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
