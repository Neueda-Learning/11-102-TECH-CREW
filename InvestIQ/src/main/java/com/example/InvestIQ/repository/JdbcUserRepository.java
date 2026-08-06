package com.example.InvestIQ.repository;

import com.example.InvestIQ.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcUserRepository implements UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public JdbcUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<User> userRowMapper = (rs, rowNum) -> new User(
            rs.getLong("id"),
            rs.getString("username"),
            rs.getString("email"),
            rs.getString("password"),
            rs.getTimestamp("created_at").toLocalDateTime()
    );


    @Override
    public List<User> findAll() {
        String sql = "SELECT * FROM users";
        return jdbcTemplate.query(sql, userRowMapper);
    }

    @Override
    public Optional<User> findById(Long id) {
        return jdbcTemplate.query("SELECT * FROM users WHERE id = ?", userRowMapper, id)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<User> save(User user) {
        if (user.id() != null) {
            String updateSql = "UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?";
            int rowsAffected = jdbcTemplate.update(updateSql,
                    user.username(),
                    user.email(),
                    user.password(),
                    user.id());
            if (rowsAffected > 0) {
                return findById(user.id());
            }
            return Optional.empty();
        }

        String sql = "INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, user.username());
            ps.setString(2, user.email());
            ps.setString(3, user.password());
            ps.setTimestamp(4, java.sql.Timestamp.valueOf(LocalDateTime.now()));
            return ps;
        }, keyHolder);

        Long generatedId = keyHolder.getKey().longValue();
        return findById(generatedId);
    }

    @Override
    public void deleteById(Long id) {
        String sql = "DELETE FROM users WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return jdbcTemplate.query("SELECT * FROM users WHERE username = ?", userRowMapper, username)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jdbcTemplate.query("SELECT * FROM users WHERE email = ?", userRowMapper, email)
                .stream()
                .findFirst();
    }

    @Override
    public boolean existsByUsername(String username) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username) > 0;
    }

    @Override
    public boolean existsByEmail(String email) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, email) > 0;
    }
}

