import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class TestBCrypt {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String raw = "Doctor@123";
        String encoded = "$2b$10$wviZQ/CY6jbTvOrhTUxOp.Z/sVsewIpCyKWCWkqOtZWn3hU/QNy1q";
        System.out.println("Matches Doctor@123: " + encoder.matches(raw, encoded));
        
        System.out.println("Admin@123: " + encoder.matches("Admin@123", "$2b$10$b0Ecgsc0MYUYyYHE5VCC.exhIXCRabJdDEm6FeYNZCXbUBEDw1mFe"));
    }
}
