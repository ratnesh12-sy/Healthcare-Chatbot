import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class TestLoginApi {
    public static void main(String[] args) {
        testLogin("admin", "Admin@123");
        testLogin("dr.sharma", "Doctor@123");
        testLogin("Admin", "Admin@123"); // Test with uppercase Admin
    }

    private static void testLogin(String username, String password) {
        try {
            URL url = new URL("http://localhost:8081/api/auth/signin");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            String jsonInputString = "{\"username\": \"" + username + "\", \"password\": \"" + password + "\"}";

            try(OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonInputString.getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            System.out.println("Login " + username + " -> HTTP " + code);

            Scanner scanner = new Scanner(code >= 400 ? conn.getErrorStream() : conn.getInputStream());
            while (scanner.hasNext()) {
                System.out.println(scanner.nextLine());
            }
            scanner.close();
        } catch (Exception e) {
            System.out.println("Could not connect to backend. Is it running? " + e.getMessage());
        }
    }
}
