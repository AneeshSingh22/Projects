/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
/**
 *
 * @author singh
 */
public class MultiTableQueries {
    
    private static Connection connection;
    private static PreparedStatement getAllClassDescriptionsStatement;
    private static PreparedStatement getScheduledStudentsStatement;
    private static ResultSet resultSet;

    public static ArrayList<ClassDescription> getAllClassDescriptions(String semester) {
        connection = DBConnection.getConnection();
        ArrayList<ClassDescription> classDescriptions = new ArrayList<>();
        try {
            getAllClassDescriptionsStatement = connection.prepareStatement(
                "select app.class.courseCode, description, seats from app.class, app.course where semester = ? and app.class.courseCode = app.course.courseCode order by app.class.courseCode"
            );
            getAllClassDescriptionsStatement.setString(1, semester);
            resultSet = getAllClassDescriptionsStatement.executeQuery();

            while (resultSet.next()) {
                String courseCode = resultSet.getString("courseCode");
                String description = resultSet.getString("description");
                int seats = resultSet.getInt("seats");
                classDescriptions.add(new ClassDescription(courseCode, description, seats));
            }
        } 
        catch (SQLException sqlException) 
        {
            sqlException.printStackTrace();
        }
        return classDescriptions;
    }
    
    public static ArrayList<StudentEntry> getScheduledStudentsByClass(String semester, String courseCode) {
        connection = DBConnection.getConnection();
        ArrayList<StudentEntry> scheduledStudents = new ArrayList<>();

        try {
            getScheduledStudentsStatement = connection.prepareStatement(
                "select app.schedule.studentID, firstName, lastName, status from app.schedule, app.student where semester = ? and courseCode = ? and status = 'S' and app.schedule.studentID = app.student.studentID"
            );
            getScheduledStudentsStatement.setString(1, semester);
            getScheduledStudentsStatement.setString(2, courseCode);
            resultSet = getScheduledStudentsStatement.executeQuery();

            while (resultSet.next()) {
                String studentID = resultSet.getString("studentID");
                String firstName = resultSet.getString("firstName");
                String lastName = resultSet.getString("lastName");

                scheduledStudents.add(new StudentEntry(studentID, firstName, lastName));
            }
        } catch (SQLException sqlException) {
            sqlException.printStackTrace();
        }
    
        return scheduledStudents;
    }
    
    public static ArrayList<StudentEntry> getWaitlistedStudentsByClass(String semester, String courseCode) {
        connection = DBConnection.getConnection();
        ArrayList<StudentEntry> scheduledStudents = new ArrayList<>();

        try {
            getScheduledStudentsStatement = connection.prepareStatement(
                "select app.schedule.studentID, firstName, lastName, status from app.schedule, app.student where semester = ? and courseCode = ? and status = 'W' and app.schedule.studentID = app.student.studentID"
            );
            getScheduledStudentsStatement.setString(1, semester);
            getScheduledStudentsStatement.setString(2, courseCode);
            resultSet = getScheduledStudentsStatement.executeQuery();

            while (resultSet.next()) {
                String studentID = resultSet.getString("studentID");
                String firstName = resultSet.getString("firstName");
                String lastName = resultSet.getString("lastName");

                scheduledStudents.add(new StudentEntry(studentID, firstName, lastName));
            }
        } catch (SQLException sqlException) {
            sqlException.printStackTrace();
        }
    
        return scheduledStudents;
    }

}
