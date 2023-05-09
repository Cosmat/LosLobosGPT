build:
	docker build -t loslobosgpt .

run:
	docker run -d -p 3000:3000 --name loslobosgpt --rm loslobosgpt