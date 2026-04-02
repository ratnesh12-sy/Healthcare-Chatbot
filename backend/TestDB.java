import java.sql.*;

public class TestDB {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://ep-rough-silence-a1ktbcc5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
        String user = "neondb_owner";
        String password = "npg_eus6JrbvTS8a";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to database successfully!");
            
            DatabaseMetaData md = conn.getMetaData();
            ResultSet rs = md.getTables(null, "public", "%", new String[]{"TABLE"});
            System.out.println("Tables in 'public' schema:");
            while (rs.next()) {
                System.out.println("- " + rs.getString(3));
            }
        } catch (SQLException e) {
            System.err.println("Connection failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
