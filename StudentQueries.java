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
public class StudentQueries {
    private static Connection connection;
    
    private static PreparedStatement addStudent;
    private static PreparedStatement getAllStudents;
    private static PreparedStatement getStudentID;
    private static PreparedStatement getStudent;
    private static PreparedStatement dropStudent;

    private static ResultSet resultSet;

    public static void addStudent(StudentEntry student)
    {
        connection = DBConnection.getConnection();
        try
        {
            addStudent = connection.prepareStatement("insert into app.student (studentid, firstname, lastname) values (?, ?, ?)");
            addStudent.setString(1, student.getStudentID());
            addStudent.setString(2, student.getFirstName());
            addStudent.setString(3, student.getLastName());
            addStudent.executeUpdate();
        }
        catch(SQLException sqlException)
        {
            sqlException.printStackTrace();
        }
    }

    public static ArrayList<StudentEntry> getAllStudents()
    {
        ArrayList<StudentEntry> faculty = new ArrayList<StudentEntry>();
        connection = DBConnection.getConnection();
        try
        {
            getAllStudents = connection.prepareStatement("select studentid, firstname, lastname from app.student");
            resultSet = getAllStudents.executeQuery();
            
            while(resultSet.next())
            {
                faculty.add(new StudentEntry(resultSet.getString(1), resultSet.getString(2), resultSet.getString(3)));
            }

        }
        catch(SQLException sqlException)
        {
            sqlException.printStackTrace();
            
        }
        return faculty;
    }
    public static String getStudentID(String lastName){
        connection = DBConnection.getConnection();
        String id = "";
        try
        {
            getStudentID = connection.prepareStatement("select StudentID from app.student where LastName = ?");
            getStudentID.setString(1, lastName);
            resultSet = getStudentID.executeQuery();
            
            while (resultSet.next()){
                id = resultSet.getString(1);
            }
        }
        catch(SQLException sqlException)
        {
            sqlException.printStackTrace();
        }
        return id;
    }
    
    public static StudentEntry getStudent(String id) {
        connection = DBConnection.getConnection();
        StudentEntry student = new StudentEntry("", "", "");
        try {
            getStudent = connection.prepareStatement("select * from app.student where studentID = ?");
            getStudent.setString(1, id);
            resultSet = getStudent.executeQuery();

            while (resultSet.next()) {
                student.setStudentID(resultSet.getString(1));
                student.setFirstName(resultSet.getString(2));
                student.setLastName(resultSet.getString(3));
            }
        } catch (SQLException sqlException) {
            sqlException.printStackTrace();
        }
        return student;
    }
    public static void dropStudent(String studentID) {
        connection = DBConnection.getConnection();
        try {
            dropStudent = connection.prepareStatement("delete from app.student where studentID = ?");
            dropStudent.setString(1, studentID);
            dropStudent.executeUpdate();
        } catch (SQLException sqlException) {
            sqlException.printStackTrace();
        }
    }

}