import java.sql.*;

public class CheckUsers {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://ep-rough-silence-a1ktbcc5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
        String user = "neondb_owner";
        String password = "npg_eus6JrbvTS8a";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to database successfully!");
            
            String query = "SELECT id, username, password FROM users";
            try (Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery(query)) {
                System.out.println("Users in DB:");
                while (rs.next()) {
                    System.out.println("ID: " + rs.getInt("id") + " | Username: " + rs.getString("username") + " | Password: " + rs.getString("password"));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
