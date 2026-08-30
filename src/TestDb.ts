import { SQL } from "bun"
import {
	DockerComposeEnvironment,
	StartedDockerComposeEnvironment,
	Wait
} from "testcontainers"

const TEST_ENV = {
	DB_DB: "jj_db",
	DB_USERNAME: "jj_usr",
	DB_PASSWORD: "jj_pwd"
}

export class TestDb {
	readonly #compose: StartedDockerComposeEnvironment
	readonly #connectionUri: URL
	readonly #client: SQL
	constructor(compose: StartedDockerComposeEnvironment, uri: URL, client: SQL) {
		this.#compose = compose
		this.#connectionUri = uri
		this.#client = client
	}

	public get client(): SQL {
		return this.#client
	}

	public get connectionUri(): URL {
		return this.#connectionUri
	}

	public static async start(): Promise<TestDb> {
		const compose = await new DockerComposeEnvironment(
			"./src",
			"docker-compose.test.yaml"
		)
			.withEnvironment(TEST_ENV)
			// let migrator finish
			.withWaitStrategy("migrator-1", Wait.forOneShotStartup())
			.up()

		const pg = compose.getContainer("db-1")
		const uri = new URL("", "postgres://")
		uri.hostname = pg.getHost()
		uri.port = pg.getFirstMappedPort().toString()
		uri.pathname = TEST_ENV.DB_DB
		uri.username = TEST_ENV.DB_USERNAME
		uri.password = TEST_ENV.DB_PASSWORD

		const client = await new SQL(uri.toString()).connect()

		return new TestDb(compose, uri, client)
	}

	public async stop(): Promise<void> {
		await this.#client.close()
		await this.#compose.down()
	}
}
