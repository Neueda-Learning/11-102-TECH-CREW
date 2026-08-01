package com.example.InvestIQ;

import com.example.InvestIQ.model.Investment;
import com.example.InvestIQ.repository.InvestmentRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;

@SpringBootApplication
public class InvestIqApplication {

	public static void main(String[] args) {
		SpringApplication.run(InvestIqApplication.class, args);
	}

	@Bean
	CommandLineRunner verifyMySqlConnection(InvestmentRepository investmentRepository) {
		return args -> {
			long totalInvestments = investmentRepository.count();
			System.out.println("Total investments found in MySQL: " + totalInvestments);

			for (Investment investment : investmentRepository.findAll()) {
				System.out.println(
					"Investment{id=" + investment.getId()
						+ ", symbol='" + investment.getSymbol() + '\''
						+ ", name='" + investment.getName() + '\''
						+ ", quantity=" + investment.getQuantity()
						+ ", purchasePrice=" + investment.getPurchasePrice()
						+ ", purchaseDate=" + investment.getPurchaseDate()
						+ "}"
				);
			}
		};
	}

}
